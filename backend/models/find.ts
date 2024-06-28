import { OPENAI_PROMPT } from "../../src/constants";
import { checkDomain } from "./domainr";
import { openAiPrompt } from "./openai";
import { parseDomains } from "../../src/helpers";

export const getDomainSuggestions = async (type: string, words: string) => {
  const prompt = OPENAI_PROMPT(type, words);
  const response = await openAiPrompt(prompt);
  const domains = parseDomains(response);
  const results = await Promise.all(domains.map(checkDomain));

  return domains.reduce((acc, domain, index) => {
    acc[domain] = results[index];
    return acc;
  }, {});
};
