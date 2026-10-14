import type { DomainResult } from "../../shared/domain.ts";

const registrarUrl = (domain: string) => `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;

// Domains read like links on an old web page: unvisited blue when free to
// register, visited purple (and struck through) when someone already has it.
export const DomainLink = ({ domain, result }: { domain: string; result?: DomainResult }) => {
  if (!result) {
    return (
      <span className="domain is-checking">
        {domain}
        <span className="sr-only">, checking</span>
      </span>
    );
  }

  if (result.status === "available") {
    return (
      <a
        className={result.certain ? "domain is-free" : "domain is-free is-maybe"}
        href={registrarUrl(domain)}
        target="_blank"
        rel="noreferrer"
        title={
          result.certain
            ? "Free to register. Opens Porkbun."
            : `Probably free. .${result.tld} has no public registry lookup, so only DNS was checked.`
        }
      >
        {domain}
        <span className="sr-only">{result.certain ? ", free" : ", probably free"}</span>
      </a>
    );
  }

  if (result.status === "taken") {
    return (
      <a className="domain is-taken" href={`https://${domain}`} target="_blank" rel="noreferrer" title="Taken. Opens the site.">
        {domain}
        <span className="sr-only">, taken</span>
      </a>
    );
  }

  return (
    <span className="domain is-unknown" title="The registry didn't answer. Try again later.">
      {domain}
      <span className="sr-only">, couldn't check</span>
    </span>
  );
};
