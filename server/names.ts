import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Feel } from "../shared/domain.ts";

export type NameIdea = { name: string; why: string };

export type NameRequest = {
  description: string;
  feels: Feel[];
  exclude: string[];
  count: number;
};

export type GenerateNames = (request: NameRequest, signal: AbortSignal) => AsyncIterable<NameIdea>;

const NameIdeas = z.object({
  names: z.array(z.object({ name: z.string(), why: z.string() })),
});

const INSTRUCTIONS = `You name things. Suggest brandable names for what the user describes.
Every name will be registered as a domain, so each one must be:
- one word or a closed compound, 4 to 12 letters, no spaces, hyphens or TLD
- easy to spell after hearing it once, and easy to say
- distinctive: not a generic phrase like "bestcoffeecups", and not a famous existing brand
Mix approaches: invented words, blends, compounds, and real words used in an unexpected way.
Short dictionary words are almost all taken as .com domains, so lean toward invented words and compounds.
"why" is one plain sentence of at most 14 words saying what the name evokes. No marketing fluff.
Never suggest a name from the already-suggested list.`;

export const buildInput = ({ description, feels, exclude, count }: NameRequest) =>
  [
    `What I'm naming: ${description}`,
    `Feel: ${feels.length ? feels.join(", ") : "no preference"}`,
    `Already suggested: ${exclude.length ? exclude.join(", ") : "none"}`,
    `Suggest ${count} names.`,
  ].join("\n");

// Structured output arrives as one JSON document, token by token. Pull each
// {"name": …, "why": …} object out as soon as it closes, so the first names
// reach the browser (and their domain checks start) long before the model is done.
export const createIdeaExtractor = () => {
  const pattern = /\{\s*"name"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"why"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  let buffer = "";
  let cursor = 0;
  return (delta: string): NameIdea[] => {
    buffer += delta;
    const ideas: NameIdea[] = [];
    pattern.lastIndex = cursor;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(buffer))) {
      ideas.push({ name: JSON.parse(`"${match[1]}"`), why: JSON.parse(`"${match[2]}"`) });
      cursor = pattern.lastIndex;
    }
    return ideas;
  };
};

export const createOpenAiNames = ({ apiKey, model }: { apiKey: string; model: string }): GenerateNames => {
  const client = new OpenAI({ apiKey });

  return async function* (request, signal) {
    const stream = client.responses.stream(
      {
        model,
        instructions: INSTRUCTIONS,
        input: buildInput(request),
        reasoning: { effort: "low" },
        text: { format: zodTextFormat(NameIdeas, "name_ideas") },
      },
      { signal },
    );

    const extract = createIdeaExtractor();
    const emitted = new Set<string>();
    for await (const event of stream) {
      if (event.type !== "response.output_text.delta") continue;
      for (const idea of extract(event.delta)) {
        emitted.add(idea.name);
        yield idea;
      }
    }

    // Anything the incremental scan missed is still in the parsed result.
    const final = await stream.finalResponse();
    for (const idea of final.output_parsed?.names ?? []) {
      if (!emitted.has(idea.name)) yield idea;
    }
  };
};

// Demo mode, for running without an OpenAI key and in tests: deterministic
// names built from the description, streamed with a little delay.
const SUFFIXES = ["ly", "kin", "nest", "loop", "wise", "hive", "mint", "ora", "scape", "craft", "folk", "spark", "verse", "nook"];
const PREFIXES = ["re", "up", "go", "my", "the", "try", "get", "hey"];

export const createDemoNames = ({ delayMs = 120 }: { delayMs?: number } = {}): GenerateNames =>
  async function* ({ description, exclude, count }, signal) {
    const words = description
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((word) => word.length >= 3 && word.length <= 8);
    const roots = words.length ? words : ["name"];
    const skip = new Set(exclude);
    const ideas: NameIdea[] = [];

    for (let i = 0; ideas.length < count && i < 500; i++) {
      const root = roots[i % roots.length]!;
      const round = Math.floor(i / roots.length);
      const name =
        round % 2 === 0
          ? root + SUFFIXES[(round / 2 + i) % SUFFIXES.length]
          : PREFIXES[(i + round) % PREFIXES.length] + root;
      if (skip.has(name)) continue;
      skip.add(name);
      ideas.push({ name, why: `Demo name built from “${root}”.` });
    }

    for (const idea of ideas) {
      if (signal.aborted) return;
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      yield idea;
    }
  };
