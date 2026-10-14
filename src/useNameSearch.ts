import { useCallback, useReducer, useRef } from "react";
import { NAMES_PER_BATCH, type DomainResult, type Feel, type StreamEvent, type Tld } from "../shared/domain.ts";
import { ApiError, checkNames, searchNames } from "./api.ts";

export type NameEntry = {
  name: string;
  why: string;
  own: boolean;
  tlds: Tld[];
  domains: Partial<Record<Tld, DomainResult>>;
};

export type Query = { description: string; feels: Feel[]; tlds: Tld[] };

// How far the current search has come: names the model has written so far, and domain
// results back so far. `expected` is a guess until the server says how many names it sent.
export type Progress = { expected: number; names: number; checks: number; tlds: number };

type State = {
  status: "idle" | "searching" | "done";
  entries: NameEntry[];
  error: string | null;
  query: Query | null;
  run: number;
  mode: "new" | "more" | null;
  generating: boolean;
  progress: Progress | null;
  checkingOwn: boolean;
};

type Action =
  | { type: "start"; mode: "new" | "more"; query: Query }
  | { type: "event"; event: StreamEvent; tlds: Tld[]; own: boolean }
  | { type: "finish" }
  | { type: "fail"; message: string; own: boolean }
  | { type: "own"; checking: boolean };

const initial: State = {
  status: "idle",
  entries: [],
  error: null,
  query: null,
  run: 0,
  mode: null,
  generating: false,
  progress: null,
  checkingOwn: false,
};

const advance = (progress: Progress | null, change: Partial<Progress>) =>
  progress && {
    ...progress,
    names: progress.names + (change.names ?? 0),
    checks: progress.checks + (change.checks ?? 0),
    expected: change.expected ?? progress.expected,
  };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "start":
      return {
        ...state,
        status: "searching",
        entries: action.mode === "new" ? [] : state.entries,
        error: null,
        query: action.query,
        run: state.run + 1,
        mode: action.mode,
        generating: true,
        progress: { expected: NAMES_PER_BATCH, names: 0, checks: 0, tlds: action.query.tlds.length },
      };
    case "event": {
      const { event, own } = action;
      if (event.type === "name") {
        const existing = state.entries.find((entry) => entry.name === event.name);
        if (existing) {
          // Checking a name that's already listed re-checks its domains in place.
          const tlds = [...new Set([...existing.tlds, ...action.tlds])];
          return { ...state, entries: state.entries.map((e) => (e === existing ? { ...e, tlds } : e)) };
        }
        const entry: NameEntry = { name: event.name, why: event.why, own, tlds: action.tlds, domains: {} };
        return {
          ...state,
          entries: own ? [entry, ...state.entries] : [...state.entries, entry],
          progress: own ? state.progress : advance(state.progress, { names: 1 }),
        };
      }
      if (event.type === "domain") {
        return {
          ...state,
          entries: state.entries.map((entry) =>
            entry.name === event.name ? { ...entry, domains: { ...entry.domains, [event.tld]: event } } : entry,
          ),
          progress: own ? state.progress : advance(state.progress, { checks: 1 }),
        };
      }
      if (event.type === "generated") {
        return { ...state, generating: false, progress: advance(state.progress, { expected: event.count }) };
      }
      return state;
    }
    case "finish":
      return state.status === "searching" ? { ...state, status: "done", generating: false } : state;
    case "fail":
      // A failed check of your own names leaves a running search alone.
      return action.own
        ? { ...state, error: action.message, checkingOwn: false }
        : { ...state, status: "done", generating: false, error: action.message };
    case "own":
      return { ...state, checkingOwn: action.checking };
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
    dispatch({ type: "own", checking: true });
    try {
      await consume(checkNames({ names, tlds }, controller.signal), tlds, true);
      dispatch({ type: "own", checking: false });
    } catch (error) {
      if (!controller.signal.aborted) dispatch({ type: "fail", message: failure(error), own: true });
    }
  }, []);

  return { ...state, search, more, stop, checkOwn };
};

// 0..1 for the loading bar. The first fifth covers the wait for the first name (the bar
// creeps there slowly, see .loadbar[data-phase]), then names, then domain checks. Never
// below 0.2 once names arrive, so the bar can't run backwards.
export const progressValue = ({ expected, names, checks, tlds }: Progress) => {
  const total = Math.max(expected, names, 1);
  return Math.min(0.97, 0.2 + 0.25 * (names / total) + 0.55 * (checks / Math.max(total * tlds, 1)));
};

export const freeDomains = (entry: NameEntry) =>
  entry.tlds.flatMap((tld) => (entry.domains[tld]?.status === "available" ? [entry.domains[tld]!] : []));

export const isSettled = (entry: NameEntry) => entry.tlds.every((tld) => entry.domains[tld]);
