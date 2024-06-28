import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { getDomainSuggestions } from "./models/find";

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("port", process.env.PORT || 5000);

app.post("/check", async (req, res) => {
  const suggestions = await getDomainSuggestions(req.body.type, req.body.words);
  res.json({ suggestions });
});

app.listen(app.get("port"), () => {
  console.log(`Server running @ port ${app.get("port")}`);
});
