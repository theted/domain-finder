import { Worker, Queue } from "bullmq";
import { QUQUE_OPTIONS } from "./config.ts";
import { checkDomain } from "./models/domainr.ts";
import { getDomainSuggestions } from "./models/find.ts";

const checkdomainQueue = new Queue("CheckDomain", QUQUE_OPTIONS);

const testDomain = async (domain: string) => {
  const isAvailable = await checkDomain(domain);
  return { domain, isAvailable };
};

const checker = new Worker(
  "CheckDomain",
  async (job) => {
    if (job.name === "check-domain") {
      // debug - return without actual checking domain availability
      console.log("Fake check =>", job.data.domain);

      return {
        domain: job.data.domain,
        isAvailable: true,
      };

      const result = await testDomain(job.data.domain);
      console.log({ result, data: job.data });

      // TODO: if this is the last event in queue for userId, brodcast an completed event as well

      return { ...result, ...job.data };
    }
  },
  QUQUE_OPTIONS
);

const finder = new Worker(
  "GetDomainSuggestions",
  async (job) => {
    if (job.name === "find-domains") {
      // debug - return fake suggestions without actually querying AI
      return ["foo.com", "bar.com", "baz.com"];

      const { type, words } = job.data;
      return getDomainSuggestions(type, words);
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
