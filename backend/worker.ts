import { Worker, Queue } from "bullmq";
import { QUQUE_OPTIONS } from "./config";
import { checkDomain } from "./models/domainr";
import { getDomainSuggestions } from "./models/find";

const checkdomainQueue = new Queue("CheckDomain", QUQUE_OPTIONS);

const testDomain = async (domain: string) => {
  const isAvailable = await checkDomain(domain);
  return { domain, isAvailable };
};

const checker = new Worker(
  "CheckDomain",
  async (job) => {
    if (job.name === "check-domain") {
      const result = await testDomain(job.data.domain);
      return { ...result, ...job.data };
    }
  },
  QUQUE_OPTIONS
);

const finder = new Worker(
  "GetDomainSuggestions",
  async (job) => {
    if (job.name === "find-domains") {
      const { type, words } = job.data;
      const suggestions = await getDomainSuggestions(type, words);
      return suggestions;
    }
  },
  QUQUE_OPTIONS
);

finder.on("completed", (job) => {
  const suggestions = job.returnvalue;

  suggestions.forEach((suggestion) => {
    checkdomainQueue.add("check-domain", { domain: suggestion });
  });
});

console.log("Worker running...");
