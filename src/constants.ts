const DOMAINR_API_KEY = process.env.DOMAINR_API_KEY;

export const DOMAINR_BASE_URL = `https://domainr.p.rapidapi.com/v2/status?mashape-key=${DOMAINR_API_KEY}&domain=`;

export const OPENAI_PROMPT = (type: string, words: string) => {
  if (!type || !words) return false;

  return `
    Hello ChatGPT!
    I'd like some suggestions for company names for my ${type}, suitable for domain names, so they should preferably be short and memorable.

    I'd like to empathize that we are ${words}.

    Can you please provide 25 suggestions in a list format?
  `;
};

export const OPENAI_MODEL = "gpt-3.5-turbo";
