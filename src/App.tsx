import { useEffect, useState } from "react";
import type { HealthResponse } from "../shared/domain.ts";
import { getHealth } from "./api.ts";
import { Results, StarIcon } from "./components/Results.tsx";
import { SavedDialog } from "./components/SavedDialog.tsx";
import { SearchForm } from "./components/SearchForm.tsx";
import { useNameSearch, type Query } from "./useNameSearch.ts";
import { useSaved } from "./useSaved.ts";

export const App = () => {
  const names = useNameSearch();
  const saved = useSaved(names.entries);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);

  useEffect(() => {
    void getHealth().then(setHealth);
  }, []);

  const search = (query: Query) => {
    saved.refresh();
    void names.search(query);
  };

  return (
    <div className="page">
      <header className="masthead">
        <a className="wordmark" href="/">
          Domain finder
        </a>
        <button type="button" className="saved-toggle" onClick={() => setSavedOpen(true)} aria-haspopup="dialog">
          <StarIcon filled={saved.items.length > 0} />
          Saved
          <span className="count">{saved.items.length}</span>
        </button>
      </header>

      {health?.demo && (
        <p className="demo-note">
          Demo mode: the server has no OpenAI key, so names are made from your own words. Domain checks are real.
        </p>
      )}

      <main>
        <section className="intro">
          <h1>Find a name with the domain still free.</h1>
          <p className="lede">
            Describe what you're naming. Every idea is checked against the domain registries for the endings you pick,
            while you watch.
          </p>
        </section>

        <SearchForm
          busy={names.status === "searching"}
          error={names.error}
          onSearch={search}
          onStop={names.stop}
          onCheckOwn={(list, tlds) => void names.checkOwn(list, tlds)}
        />

        <Results
          entries={names.entries}
          status={names.status}
          canSearchMore={names.query !== null && names.entries.length > 0}
          onMore={names.more}
          isSaved={saved.isSaved}
          onToggleSaved={saved.toggle}
        />
      </main>

      <footer className="colophon">
        <p>
          Availability comes from the registries' public RDAP records, with DNS as a fallback for endings that have none.
          A free domain can still be premium-priced, so confirm at the registrar.
        </p>
      </footer>

      <SavedDialog
        open={savedOpen}
        items={saved.items}
        onClose={() => setSavedOpen(false)}
        onRemove={saved.remove}
      />
    </div>
  );
};
