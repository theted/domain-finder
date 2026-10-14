import type { CheckRequest, HealthResponse, SearchRequest, StreamEvent } from "../shared/domain.ts";

export class ApiError extends Error {}

// POST a request and yield each line of the NDJSON response as it arrives.
async function* streamEvents(path: string, body: unknown, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError("The server can't be reached. Check that it's running, then try again.");
  }

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? `The server answered ${res.status}. Try again in a moment.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as StreamEvent;
    }
    if (done) break;
  }
}

export const searchNames = (request: SearchRequest, signal: AbortSignal) => streamEvents("/api/search", request, signal);

export const checkNames = (request: CheckRequest, signal: AbortSignal) => streamEvents("/api/check", request, signal);

export const getHealth = async (): Promise<HealthResponse | null> => {
  try {
    const res = await fetch("/api/health");
    return res.ok ? ((await res.json()) as HealthResponse) : null;
  } catch {
    return null;
  }
};
