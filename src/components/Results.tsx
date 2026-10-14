import { useState } from "react";
import { freeDomains, isSettled, type NameEntry } from "../useNameSearch.ts";
import { DomainLink } from "./DomainLink.tsx";

type Props = {
  entries: NameEntry[];
  status: "idle" | "searching" | "done";
  canSearchMore: boolean;
  onMore: () => void;
  isSaved: (name: string) => boolean;
  onToggleSaved: (entry: NameEntry) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const Results = ({ entries, status, canSearchMore, onMore, isSaved, onToggleSaved }: Props) => {
  const [onlyFree, setOnlyFree] = useState(false);

  if (status === "idle" && !entries.length) return null;

  const withFree = entries.filter((entry) => freeDomains(entry).length > 0).length;
  const anyUncertain = entries.some((entry) => freeDomains(entry).some((result) => !result.certain));
  const visible = onlyFree ? entries.filter((entry) => !isSettled(entry) || freeDomains(entry).length) : entries;
  const summary =
    !entries.length && status === "searching"
      ? "Thinking up names…"
      : `${plural(entries.length, "name")}, ${withFree} with a free domain`;

  return (
    <section className="results" aria-labelledby="results-heading">
      <div className="results-head">
        <h2 id="results-heading">{summary}</h2>
        <label className="toggle">
          <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} />
          Hide names with no free domain
        </label>
      </div>

      <p className="key">
        <span className="domain is-free">free to register</span>
        {anyUncertain && <span className="domain is-free is-maybe">probably free</span>}
        <span className="domain is-taken">taken</span>
      </p>

      <p className="sr-only" aria-live="polite">
        {status === "done" && entries.length ? `Found ${summary}.` : ""}
      </p>

      <ul className="names">
        {visible.map((entry) => {
          const settled = isSettled(entry);
          const allTaken = settled && freeDomains(entry).length === 0;
          const saved = isSaved(entry.name);
          return (
            <li key={entry.name} className={allTaken ? "name-row is-all-taken" : "name-row"}>
              <div className="name-line">
                <h3 className="name">{entry.name}</h3>
                <button
                  type="button"
                  className="save"
                  aria-pressed={saved}
                  aria-label={`${saved ? "Saved" : "Save"} ${entry.name}`}
                  onClick={() => onToggleSaved(entry)}
                >
                  <StarIcon filled={saved} />
                  <span aria-hidden="true">{saved ? "Saved" : "Save"}</span>
                </button>
              </div>
              <p className="why">{entry.own ? "Your idea." : entry.why}</p>
              <ul className="domains">
                {entry.tlds.map((tld) => (
                  <li key={tld}>
                    <DomainLink domain={`${entry.name}.${tld}`} result={entry.domains[tld]} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {onlyFree && visible.length < entries.length && (
        <p className="hidden-note">
          {plural(entries.length - visible.length, "name")} hidden because every domain is taken.
        </p>
      )}

      {canSearchMore && (
        <div className="more">
          <button type="button" className="secondary" onClick={onMore} disabled={status === "searching"}>
            Suggest more names
          </button>
        </div>
      )}
    </section>
  );
};
