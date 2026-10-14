import type { CSSProperties } from "react";

// The browser tab's loading ring: an arc that grows, shrinks and turns. Sized by font-size,
// coloured by currentColor, so it sits inside buttons and headings without extra styling.
export const Spinner = () => (
  <span className="spinner" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
    </svg>
  </span>
);

type LoadBarProps = { value: number; state: "loading" | "done" | "failed"; waiting: boolean };

// A page-load bar along the top edge. Remount it (via key) for each search so it never
// runs backwards from a finished 100% to the next search's first sliver.
export const LoadBar = ({ value, state, waiting }: LoadBarProps) => (
  <div
    className="loadbar"
    data-state={state}
    data-phase={waiting ? "waiting" : "running"}
    style={{ "--progress": value } as CSSProperties}
    aria-hidden="true"
  />
);
