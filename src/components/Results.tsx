import { useEffect, useRef, useState } from "react";
import { freeDomains, isSettled, type NameEntry } from "../useNameSearch.ts";
import { DomainLink } from "./DomainLink.tsx";
import { Spinner } from "./Spinner.tsx";

type Props = {
  entries: NameEntry[];
  status: "idle" | "searching" | "done";
  mode: "new" | "more" | null;
  run: number;
  generating: boolean;
  canSearchMore: boolean;
  onMore: () => void;
  isSaved: (name: string) => boolean;
  onToggleSaved: (entry: NameEntry) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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

// Stand-in rows where names are about to land, while the model is still writing.
const Placeholder = () => (
  <li className="name-row is-placeholder" aria-hidden="true">
    <div className="name-row-inner">
      <div className="shimmer shimmer-name" />
      <div className="shimmer shimmer-why" />
      <div className="shimmer-domains">
        <div className="shimmer shimmer-domain" />
        <div className="shimmer shimmer-domain" />
        <div className="shimmer shimmer-domain" />
      </div>
    </div>
  </li>
);

export const Results = (props: Props) => {
  const { entries, status, mode, run, generating, canSearchMore, onMore, isSaved, onToggleSaved } = props;
  const [onlyFree, setOnlyFree] = useState(false);
  const section = useRef<HTMLElement>(null);

  // A new search scrolls the results into view if they start below the fold.
  useEffect(() => {
    const el = section.current;
    if (!el || mode !== "new" || el.getBoundingClientRect().top < window.innerHeight * 0.6) return;
    el.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [run, mode]);

  if (status === "idle" && !entries.length) return null;

  const searching = status === "searching";
  const withFree = entries.filter((entry) => freeDomains(entry).length > 0).length;
  const anyUncertain = entries.some((entry) => freeDomains(entry).some((result) => !result.certain));
  const hidden = onlyFree ? entries.filter((entry) => isSettled(entry) && !freeDomains(entry).length).length : 0;
  const placeholders = searching && generating ? (entries.length ? 1 : 3) : 0;
  const summary = `${plural(entries.length, "name")}, ${withFree} with a free domain`;

  return (
    <section ref={section} className="results" aria-labelledby="results-heading" aria-busy={searching}>
      <div className="results-head">
        <h2 id="results-heading">
          {!entries.length && searching ? (
            <>
              <Spinner />
              Thinking up names…
            </>
          ) : (
            summary
          )}
        </h2>
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
        {entries.map((entry) => {
          const settled = isSettled(entry);
          const allTaken = settled && freeDomains(entry).length === 0;
          const collapsed = onlyFree && allTaken;
          const saved = isSaved(entry.name);
          return (
            <li
              key={entry.name}
              className={allTaken ? "name-row is-all-taken" : "name-row"}
              data-collapsed={collapsed}
              aria-hidden={collapsed || undefined}
              inert={collapsed}
            >
              <div className="name-row-inner">
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
              </div>
            </li>
          );
        })}
        {Array.from({ length: placeholders }, (_, i) => (
          <Placeholder key={`placeholder-${i}`} />
        ))}
      </ul>

      {hidden > 0 && (
        <p className="hidden-note">{plural(hidden, "name")} hidden because every domain is taken.</p>
      )}

      {canSearchMore && !(searching && mode === "new") && (
        <div className="more">
          <button type="button" className="secondary" onClick={onMore} disabled={searching}>
            {searching ? (
              <>
                <Spinner />
                Finding more names…
              </>
            ) : (
              "Suggest more names"
            )}
          </button>
        </div>
      )}
    </section>
  );
};
