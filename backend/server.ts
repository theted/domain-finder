import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import { QueueEvents } from "bullmq";
import { Queue } from "bullmq";
import { QUQUE_OPTIONS } from "./config.ts";
import path from "path";
import { fileURLToPath } from "url";
import { fork } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5000;
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("port", PORT);

app.use((req, _res, next) => {
  console.log({ method: req.method, url: req.url, body: req.body });
  next();
});

const server = app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} in ${process.env.NODE_ENV} environment`
  );
});

const getDomains = new Queue("GetDomainSuggestions", QUQUE_OPTIONS);
const queueEvents = new QueueEvents("CheckDomain");

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.get("/", (_req, res) => {
  res.send("Hello from server!");
});

app.post("/check", async (req, res) => {
  const { type, words } = req.body;
  getDomains.add("find-domains", { type, words });
  res.send("Request received, check results using websockets");
});

queueEvents.on("completed", (data) => {
  console.log("check domain event", data);
  io.emit("check-domain", data);
});

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

// if in development, also spin up a worker as a child process
if (process.env.NODE_ENV === "development") {
  console.log("Starting worker...");
  const worker = fork(path.join(__dirname, "worker.ts"));
  worker.on("message", (message) => {
    console.log("worker message", message);
  });
}
