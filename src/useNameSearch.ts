import { useCallback, useReducer, useRef } from "react";
import type { DomainResult, Feel, StreamEvent, Tld } from "../shared/domain.ts";
import { ApiError, checkNames, searchNames } from "./api.ts";

export type NameEntry = {
  name: string;
  why: string;
  own: boolean;
  tlds: Tld[];
  domains: Partial<Record<Tld, DomainResult>>;
};

export type Query = { description: string; feels: Feel[]; tlds: Tld[] };

type State = {
  status: "idle" | "searching" | "done";
  entries: NameEntry[];
  error: string | null;
  query: Query | null;
};

type Action =
  | { type: "start"; mode: "new" | "more"; query: Query }
  | { type: "event"; event: StreamEvent; tlds: Tld[]; own: boolean }
  | { type: "finish" }
  | { type: "fail"; message: string; own: boolean };

const initial: State = { status: "idle", entries: [], error: null, query: null };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "start":
      return {
        status: "searching",
        entries: action.mode === "new" ? [] : state.entries,
        error: null,
        query: action.query,
      };
    case "event": {
      const { event } = action;
      if (event.type === "name") {
        const existing = state.entries.find((entry) => entry.name === event.name);
        if (existing) {
          // Checking a name that's already listed re-checks its domains in place.
          const tlds = [...new Set([...existing.tlds, ...action.tlds])];
          return { ...state, entries: state.entries.map((e) => (e === existing ? { ...e, tlds } : e)) };
        }
        const entry: NameEntry = { name: event.name, why: event.why, own: action.own, tlds: action.tlds, domains: {} };
        return { ...state, entries: action.own ? [entry, ...state.entries] : [...state.entries, entry] };
      }
      if (event.type === "domain") {
        return {
          ...state,
          entries: state.entries.map((entry) =>
            entry.name === event.name ? { ...entry, domains: { ...entry.domains, [event.tld]: event } } : entry,
          ),
        };
      }
      return state;
    }
    case "finish":
      return state.status === "searching" ? { ...state, status: "done" } : state;
    case "fail":
      // A failed check of your own names leaves a running search alone.
      return { ...state, status: action.own ? state.status : "done", error: action.message };
  }
};

const failure = (error: unknown) =>
  error instanceof ApiError ? error.message : "Something went wrong while reading results. Try again.";

export const useNameSearch = () => {
  const [state, dispatch] = useReducer(reducer, initial);
  const searchAbort = useRef<AbortController | null>(null);
  const ownAbort = useRef<AbortController | null>(null);

  const consume = async (events: AsyncIterable<StreamEvent>, tlds: Tld[], own: boolean) => {
    for await (const event of events) {
      if (event.type === "error") throw new ApiError(event.message);
      dispatch({ type: "event", event, tlds, own });
    }
  };

  const runSearch = useCallback(async (mode: "new" | "more", query: Query, exclude: string[]) => {
    searchAbort.current?.abort();
    const controller = (searchAbort.current = new AbortController());
    dispatch({ type: "start", mode, query });
    try {
      await consume(searchNames({ ...query, exclude }, controller.signal), query.tlds, false);
      dispatch({ type: "finish" });
    } catch (error) {
      if (!controller.signal.aborted) dispatch({ type: "fail", message: failure(error), own: false });
    }
  }, []);

  const search = useCallback((query: Query) => runSearch("new", query, []), [runSearch]);

  const more = useCallback(() => {
    if (state.query) void runSearch("more", state.query, state.entries.map((entry) => entry.name));
  }, [runSearch, state.query, state.entries]);

  const stop = useCallback(() => {
    searchAbort.current?.abort();
    dispatch({ type: "finish" });
  }, []);

  // Checking your own names runs alongside a search instead of cancelling it.
  const checkOwn = useCallback(async (names: string[], tlds: Tld[]) => {
    ownAbort.current?.abort();
    const controller = (ownAbort.current = new AbortController());
    try {
      await consume(checkNames({ names, tlds }, controller.signal), tlds, true);
    } catch (error) {
      if (!controller.signal.aborted) dispatch({ type: "fail", message: failure(error), own: true });
    }
  }, []);

  return { ...state, search, more, stop, checkOwn };
};

export const freeDomains = (entry: NameEntry) =>
  entry.tlds.flatMap((tld) => (entry.domains[tld]?.status === "available" ? [entry.domains[tld]!] : []));

export const isSettled = (entry: NameEntry) => entry.tlds.every((tld) => entry.domains[tld]);
