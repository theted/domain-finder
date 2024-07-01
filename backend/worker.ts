import { Worker } from "bullmq";
import { QUQUE_OPTIONS } from "./config";
import { checkDomain } from "./models/domainr";

const testDomain = async (domain: string) => {
  console.log(`checking domain => ${domain}`);
  const isAvailable = await checkDomain(domain);
  return { domain, isAvailable };
};

const checker = new Worker(
  "CheckDomain",
  async (job) => {
    if (job.name === "check-domain") {
      const result = await testDomain(job.data.domain);
      console.log({ result, name: job.name, data: job.data });
      return { ...result, ...job.data };
    }
  },
  QUQUE_OPTIONS
);

checker.on("completed", (job) => {
  console.log(`# ${job.id} completed!`, job.data);
});

checker.on("failed", (job, err) => {
  console.log(`${job.id} failed with ${err.message}`);
});

console.log("Worker running...");
