import { useCallback, useEffect, useMemo, useState } from "react";
import type { DomainResult } from "../shared/domain.ts";
import type { NameEntry } from "./useNameSearch.ts";

export type SavedName = { name: string; why: string; domains: DomainResult[] };

const STORAGE_KEY = "domain-finder:saved";

const load = (): SavedName[] => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(data) ? (data as SavedName[]) : [];
  } catch {
    return [];
  }
};

const snapshot = (entry: NameEntry): SavedName => ({
  name: entry.name,
  why: entry.why,
  domains: entry.tlds.flatMap((tld) => (entry.domains[tld] ? [entry.domains[tld]!] : [])),
});

const merge = (saved: SavedName[], entries: NameEntry[]) =>
  saved.map((item) => {
    const entry = entries.find((e) => e.name === item.name);
    if (!entry) return item;
    const fresh = snapshot(entry);
    return fresh.domains.length >= item.domains.length ? { ...fresh, why: fresh.why || item.why } : item;
  });

// Saved names live in this browser only. Domain results keep updating while
// the name is still on screen; `refresh` folds them in before a new search clears it.
export const useSaved = (entries: NameEntry[]) => {
  const [saved, setSaved] = useState<SavedName[]>(load);
  const items = useMemo(() => merge(saved, entries), [saved, entries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be full or blocked; saving still works for this visit.
    }
  }, [items]);

  const toggle = useCallback(
    (entry: NameEntry) =>
      setSaved((current) =>
        current.some((item) => item.name === entry.name)
          ? current.filter((item) => item.name !== entry.name)
          : [...current, snapshot(entry)],
      ),
    [],
  );

  const remove = useCallback((name: string) => setSaved((current) => current.filter((item) => item.name !== name)), []);

  const refresh = useCallback(() => setSaved(items), [items]);

  const isSaved = useCallback((name: string) => saved.some((item) => item.name === name), [saved]);

  return { items, toggle, remove, refresh, isSaved };
};
