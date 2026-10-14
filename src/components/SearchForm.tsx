import { useId, useState, type FormEvent } from "react";
import {
  DEFAULT_TLDS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  FEELS,
  MAX_FEELS,
  MAX_OWN_NAMES,
  MAX_TLDS,
  TLDS,
  type Feel,
  type Tld,
} from "../../shared/domain.ts";
import { EXAMPLES } from "../examples.ts";
import type { Query } from "../useNameSearch.ts";

type Props = {
  busy: boolean;
  error: string | null;
  onSearch: (query: Query) => void;
  onStop: () => void;
  onCheckOwn: (names: string[], tlds: Tld[]) => void;
};

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export const SearchForm = ({ busy, error, onSearch, onStop, onCheckOwn }: Props) => {
  const id = useId();
  const [description, setDescription] = useState("");
  const [feels, setFeels] = useState<Feel[]>([]);
  const [tlds, setTlds] = useState<Tld[]>(DEFAULT_TLDS);
  const [example, setExample] = useState(() => Math.floor(Math.random() * EXAMPLES.length));
  const [ownNames, setOwnNames] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (description.trim().length < DESCRIPTION_MIN) {
      setHint("Describe what you're naming in a few words first.");
      return;
    }
    setHint(null);
    onSearch({ description: description.trim(), feels, tlds });
  };

  const checkOwn = (event: FormEvent) => {
    event.preventDefault();
    const names = ownNames
      .split(/[\s,]+/)
      .filter(Boolean)
      .slice(0, MAX_OWN_NAMES);
    if (!names.length) return;
    onCheckOwn(names, tlds);
    setOwnNames("");
  };

  const fillExample = () => {
    setDescription(EXAMPLES[example]!);
    setExample((example + 1) % EXAMPLES.length);
    setHint(null);
  };

  const message = hint ?? error;

  return (
    <div className="search">
      <form className="search-form" onSubmit={submit} noValidate>
        <div className="field">
          <div className="field-head">
            <label htmlFor={`${id}-description`}>What are you naming?</label>
            <button type="button" className="text-button" onClick={fillExample}>
              Try an example
            </button>
          </div>
          <textarea
            id={`${id}-description`}
            className="omnibox"
            rows={2}
            maxLength={DESCRIPTION_MAX}
            placeholder={EXAMPLES[0]}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </div>

        <fieldset className="field">
          <legend>
            Feel <span className="hint">up to {MAX_FEELS}, optional</span>
          </legend>
          <div className="chips">
            {FEELS.map((feel) => {
              const on = feels.includes(feel);
              return (
                <button
                  key={feel}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  disabled={!on && feels.length >= MAX_FEELS}
                  onClick={() => setFeels(toggle(feels, feel))}
                >
                  {feel}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>
            Domain endings <span className="hint">up to {MAX_TLDS}</span>
          </legend>
          <div className="chips">
            {TLDS.map((tld) => {
              const on = tlds.includes(tld);
              return (
                <button
                  key={tld}
                  type="button"
                  className="chip chip-tld"
                  aria-pressed={on}
                  disabled={on ? tlds.length === 1 : tlds.length >= MAX_TLDS}
                  onClick={() => setTlds(TLDS.filter((t) => (t === tld ? !on : tlds.includes(t))))}
                >
                  .{tld}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="actions">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Finding names…" : "Find names"}
          </button>
          {busy && (
            <button type="button" className="secondary" onClick={onStop}>
              Stop
            </button>
          )}
        </div>
        {message && (
          <p className="form-message" role="alert">
            {message}
          </p>
        )}
      </form>

      <form className="own-form" onSubmit={checkOwn}>
        <label htmlFor={`${id}-own`}>Already have a name in mind?</label>
        <div className="own-row">
          <input
            id={`${id}-own`}
            className="own-input"
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            value={ownNames}
            onChange={(e) => setOwnNames(e.target.value)}
          />
          <button type="submit" className="secondary" disabled={!ownNames.trim()}>
            Check it
          </button>
        </div>
      </form>
    </div>
  );
};
