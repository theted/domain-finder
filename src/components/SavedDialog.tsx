import { useEffect, useRef, useState } from "react";
import type { SavedName } from "../useSaved.ts";
import { DomainLink } from "./DomainLink.tsx";

type Props = {
  open: boolean;
  items: SavedName[];
  onClose: () => void;
  onRemove: (name: string) => void;
};

export const SavedDialog = ({ open, items, onClose, onRemove }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const free = items.flatMap((item) =>
    item.domains.filter((d) => d.status === "available").map((d) => d.domain),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(free.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="saved-dialog"
      aria-labelledby="saved-heading"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="saved-inner">
        <div className="saved-head">
          <h2 id="saved-heading">Saved names</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>

        {items.length === 0 ? (
          <p className="saved-empty">Nothing saved yet. Use Save on any name to keep it here, in this browser.</p>
        ) : (
          <>
            <ul className="saved-list">
              {items.map((item) => (
                <li key={item.name} className="saved-item">
                  <div className="saved-line">
                    <h3 className="saved-name">{item.name}</h3>
                    <button type="button" className="text-button" onClick={() => onRemove(item.name)}>
                      Remove
                    </button>
                  </div>
                  <ul className="domains">
                    {item.domains.map((result) => (
                      <li key={result.domain}>
                        <DomainLink domain={result.domain} result={result} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="saved-actions">
              <button type="button" className="secondary" onClick={copy} disabled={!free.length}>
                {copied ? "Copied" : `Copy ${free.length} free domain${free.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};
