import { describe, expect, it } from "vitest";
import { buildInput, createDemoNames, createIdeaExtractor } from "./names.ts";

describe("createIdeaExtractor", () => {
  it("yields each idea as soon as its object closes", () => {
    const extract = createIdeaExtractor();
    const json = JSON.stringify({
      names: [
        { name: "Mugkin", why: "A \"mug\" with a friendly ending." },
        { name: "Kilnfolk", why: "Craft, community." },
      ],
    });
    const chunks = json.match(/.{1,7}/gs)!;
    const seen: string[] = [];
    const at: number[] = [];
    chunks.forEach((chunk, i) => {
      for (const idea of extract(chunk)) {
        seen.push(`${idea.name}: ${idea.why}`);
        at.push(i);
      }
    });
    expect(seen).toEqual(['Mugkin: A "mug" with a friendly ending.', "Kilnfolk: Craft, community."]);
    expect(at[0]).toBeLessThan(chunks.length - 3);
  });

  it("tolerates whitespace between tokens", () => {
    const extract = createIdeaExtractor();
    expect(extract('{ "names": [ {\n  "name" : "Dawnloaf",\n  "why" : "Morning bread." } ]')).toEqual([
      { name: "Dawnloaf", why: "Morning bread." },
    ]);
  });
});

describe("buildInput", () => {
  it("lists feels and names to avoid", () => {
    const input = buildInput({ description: "A bakery", feels: ["warm", "nordic"], exclude: ["dawnloaf"], count: 12 });
    expect(input).toContain("What I'm naming: A bakery");
    expect(input).toContain("Feel: warm, nordic");
    expect(input).toContain("Already suggested: dawnloaf");
    expect(input).toContain("Suggest 12 names.");
  });
});

describe("createDemoNames", () => {
  it("builds the requested number of names from the description, skipping excluded ones", async () => {
    const generate = createDemoNames({ delayMs: 0 });
    const names: string[] = [];
    for await (const idea of generate(
      { description: "sourdough bakery", feels: [], exclude: ["sourdoughly"], count: 5 },
      new AbortController().signal,
    )) {
      names.push(idea.name);
    }
    expect(names).toHaveLength(5);
    expect(names).not.toContain("sourdoughly");
    expect(new Set(names).size).toBe(5);
  });
});
