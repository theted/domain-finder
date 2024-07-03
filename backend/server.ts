import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import { QueueEvents } from "bullmq";
import { Queue } from "bullmq";
import { QUQUE_OPTIONS } from "./config";

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
  console.log("Server running on port", PORT);
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
  res.send("Some status");
});

queueEvents.on("completed", (data) => {
  console.log("check domain event", data);
  io.emit("check-domain", data);
});
