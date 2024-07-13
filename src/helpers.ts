export const parseDomains = (domainString: string) => {
  const domains = domainString
    .split("\n")
    .map((line) => {
      const [number, domain] = line.split(".");
      if (!number || !domain) return null;
      return domain.trim().replace(/\s/g, "");
    })
    .filter((domain): domain is string => domain !== null);
  return createDomains(domains);
};

// TODO: support for other domains
export const createDomains = (domains: string[]) => {
  return domains.map((domain) => `${domain}.com`);
};

export const mRand = (num: number) => Math.floor(Math.random() * num);

export const randInArr = (arr: string[]) => arr[mRand(arr.length)];
