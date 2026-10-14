import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StreamEvent } from "../shared/domain.ts";
import { App } from "./App.tsx";

const ndjson = (events: StreamEvent[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        // Split mid-line to make sure the client reassembles partial chunks.
        const text = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(text.slice(0, 50)));
        controller.enqueue(encoder.encode(text.slice(50)));
        controller.close();
      },
    }),
    { headers: { "content-type": "application/x-ndjson" } },
  );

// A response whose events the test sends one at a time.
const controlledStream = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const response = new Response(new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) }), {
    headers: { "content-type": "application/x-ndjson" },
  });
  return {
    response,
    send: (...events: StreamEvent[]) =>
      controller.enqueue(encoder.encode(events.map((e) => `${JSON.stringify(e)}\n`).join(""))),
    close: () => controller.close(),
  };
};

const domain = (name: string, tld: "com" | "io" | "ai", status: "available" | "taken", certain = true): StreamEvent => ({
  type: "domain",
  domain: `${name}.${tld}`,
  name,
  tld,
  status,
  certain,
});

const searchEvents: StreamEvent[] = [
  { type: "name", name: "mugkin", why: "A mug with a friendly ending." },
  domain("mugkin", "com", "available"),
  { type: "name", name: "claycup", why: "Exactly what it is." },
  domain("mugkin", "io", "taken"),
  domain("claycup", "com", "taken"),
  domain("mugkin", "ai", "available"),
  domain("claycup", "io", "taken"),
  domain("claycup", "ai", "taken"),
  { type: "done" },
];

const mockServer = (search: () => Response, demo = false) => {
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/health") return Response.json({ ok: true, demo, model: "gpt-6-luna" });
    if (url === "/api/search") return search();
    if (url === "/api/check") {
      const { names } = JSON.parse(String(init?.body)) as { names: string[] };
      return ndjson([
        { type: "name", name: names[0]!, why: "" },
        domain(names[0]!, "com", "available"),
        domain(names[0]!, "io", "available"),
        domain(names[0]!, "ai", "available"),
        { type: "done" },
      ]);
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

const searchFor = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(screen.getByLabelText("What are you naming?"), text);
  await user.click(screen.getByRole("button", { name: "Find names" }));
};

describe("App", () => {
  it("finds names and shows which domains are free", async () => {
    const fetch = mockServer(() => ndjson(searchEvents));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "warm" }));
    await user.click(screen.getByRole("button", { name: ".ai" })); // deselect a default
    await user.click(screen.getByRole("button", { name: ".ai" })); // and select it again
    await searchFor(user, "Handmade ceramic cups");

    expect(await screen.findByRole("heading", { name: "2 names, 1 with a free domain" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "mugkin.com, free" })).toHaveAttribute(
      "href",
      "https://porkbun.com/checkout/search?q=mugkin.com",
    );
    expect(screen.getByRole("link", { name: "mugkin.io, taken" })).toHaveAttribute("href", "https://mugkin.io");

    const body = JSON.parse(String(fetch.mock.calls.find(([url]) => url === "/api/search")![1]!.body));
    expect(body).toEqual({ description: "Handmade ceramic cups", feels: ["warm"], tlds: ["com", "io", "ai"], exclude: [] });
  });

  it("hides names whose domains are all taken when asked", async () => {
    mockServer(() => ndjson(searchEvents));
    const user = userEvent.setup();
    render(<App />);
    await searchFor(user, "Ceramic cups");
    await screen.findByRole("heading", { name: "claycup" });

    await user.click(screen.getByRole("checkbox", { name: "Hide names with no free domain" }));
    expect(screen.queryByRole("heading", { name: "claycup" })).not.toBeInTheDocument();
    expect(screen.getByText("1 name hidden because every domain is taken.")).toBeInTheDocument();
  });

  it("asks for more names without repeating the ones shown", async () => {
    const fetch = mockServer(() => ndjson(searchEvents));
    const user = userEvent.setup();
    render(<App />);
    await searchFor(user, "Ceramic cups");
    await user.click(await screen.findByRole("button", { name: "Suggest more names" }));

    await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url === "/api/search")).toHaveLength(2));
    const second = JSON.parse(String(fetch.mock.calls.filter(([url]) => url === "/api/search")[1]![1]!.body));
    expect(second.exclude).toEqual(["mugkin", "claycup"]);
  });

  it("saves names and lists their free domains", async () => {
    mockServer(() => ndjson(searchEvents));
    const user = userEvent.setup();
    render(<App />);
    await searchFor(user, "Ceramic cups");

    await user.click(await screen.findByRole("button", { name: "Save mugkin" }));
    expect(screen.getByRole("button", { name: "Saved mugkin" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Saved\s*1/ }));
    const dialog = screen.getByRole("dialog", { name: "Saved names" });
    expect(within(dialog).getByRole("heading", { name: "mugkin" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy 2 free domains" })).toBeEnabled();
    expect(JSON.parse(localStorage.getItem("domain-finder:saved")!)[0].name).toBe("mugkin");
  });

  it("checks a name you bring yourself", async () => {
    mockServer(() => ndjson(searchEvents));
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Already have a name in mind?"), "Potterly");
    await user.click(screen.getByRole("button", { name: "Check it" }));

    expect(await screen.findByRole("heading", { name: "Potterly" })).toBeInTheDocument();
    expect(screen.getByText("Your idea.")).toBeInTheDocument();
  });

  it("shows what's still loading while results stream in", async () => {
    const stream = controlledStream();
    mockServer(() => stream.response);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await searchFor(user, "Ceramic cups");

    // Before the first name: spinner heading, placeholder rows, busy button, loading bar.
    expect(await screen.findByRole("heading", { name: "Thinking up names…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finding names…" })).toBeDisabled();
    expect(container.querySelectorAll(".is-placeholder")).toHaveLength(3);
    expect(container.querySelector(".loadbar")).toHaveAttribute("data-state", "loading");
    expect(screen.getByRole("region", { name: "Thinking up names…" })).toHaveAttribute("aria-busy", "true");

    // A name arrives: one placeholder stays for the next, its domains show as checking.
    stream.send({ type: "name", name: "mugkin", why: "A mug with a friendly ending." });
    expect(await screen.findByRole("heading", { name: "mugkin" })).toBeInTheDocument();
    expect(container.querySelectorAll(".is-placeholder")).toHaveLength(1);
    expect(container.querySelectorAll(".domain.is-checking")).toHaveLength(3);

    // The model is done: no more placeholders, though checks are still running.
    stream.send({ type: "generated", count: 1 });
    await waitFor(() => expect(container.querySelectorAll(".is-placeholder")).toHaveLength(0));
    expect(container.querySelector(".loadbar")).toHaveAttribute("data-state", "loading");

    stream.send(domain("mugkin", "com", "available"), domain("mugkin", "io", "taken"), domain("mugkin", "ai", "taken"));
    await waitFor(() => expect(container.querySelectorAll(".domain.is-checking")).toHaveLength(0));

    stream.send({ type: "done" });
    stream.close();
    expect(await screen.findByRole("button", { name: "Find names" })).toBeEnabled();
    expect(container.querySelector(".loadbar")).toHaveAttribute("data-state", "done");
    expect(screen.getByRole("heading", { name: "1 name, 1 with a free domain" })).toBeInTheDocument();
  });

  it("shows a spinner on the button while your own name is checked", async () => {
    const stream = controlledStream();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) =>
        String(input) === "/api/check" ? stream.response : Response.json({ ok: true, demo: false, model: "m" }),
      ),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Already have a name in mind?"), "potterly");
    await user.click(screen.getByRole("button", { name: "Check it" }));

    expect(await screen.findByRole("button", { name: "Checking…" })).toBeDisabled();
    stream.send({ type: "name", name: "potterly", why: "" }, { type: "done" });
    stream.close();
    expect(await screen.findByRole("button", { name: "Check it" })).toBeInTheDocument();
  });

  it("explains errors from the server", async () => {
    mockServer(() => Response.json({ error: "That's the hourly limit for name searches. Try again in 5 minutes." }, { status: 429 }));
    const user = userEvent.setup();
    render(<App />);
    await searchFor(user, "Ceramic cups");

    expect(await screen.findByRole("alert")).toHaveTextContent("hourly limit");
    expect(screen.getByRole("button", { name: "Find names" })).toBeEnabled();
  });

  it("asks for a description before searching", async () => {
    const fetch = mockServer(() => ndjson(searchEvents));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Find names" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Describe what you're naming");
    expect(fetch.mock.calls.some(([url]) => url === "/api/search")).toBe(false);
  });

  it("says so when the server runs in demo mode", async () => {
    mockServer(() => ndjson([]), true);
    render(<App />);
    expect(await screen.findByText(/Demo mode/)).toBeInTheDocument();
  });
});
