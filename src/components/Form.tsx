import { useState } from "react";
import { industries } from "../assets/data/industries.json";
import words from "../assets/data/words.json";
import { randInArr } from "../helpers";
import { Button } from "@/components/ui/button";
import { IndustriesSelect } from "./IndustriesSelect";
import { Input } from "@/components/ui/input";

const VITE_EVENTS_URL = import.meta.env.VITE_EVENTS_URL;

type FormProps = {
  setIsLoading: (isLoading: boolean) => void;
};

const getRandomWords = (length = 4) => {
  const outputWords = [];

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    outputWords.push(words[randomIndex]);
  }

  return outputWords.join(", ");
};

export const Form = ({ setIsLoading }: FormProps) => {
  const [type, setType] = useState(randInArr(industries));
  const [words, setWords] = useState(getRandomWords());

  // TODO: get client id for socket.io - maybe wrap in a provider?

  const randomizeForm = () => {
    setType(randInArr(industries));
    setWords(getRandomWords());
    return false;
  };

  const submitForm = async (e) => {
    e.preventDefault();

    console.log("POST =>", { type, words });
    setIsLoading(true);

    return fetch(VITE_EVENTS_URL + "/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, words }),
    });
  };

  return (
    <form className="flex grow flex-grow flex-col" onSubmit={submitForm}>
      <div className="mt-3 mb-6">
        <p className="text-black">
          This is a tool for generating domain names for your business. Domain
          names are checked if reserved, so you can be sure that all suggestions
          are available domain names.
        </p>
      </div>

      <label className="text-black text-xl" htmlFor="type">
        What is your occupation?
      </label>

      <IndustriesSelect type={type} onValueChange={(value) => setType(value)} />

      <label className="text-black text-xl" htmlFor="words">
        In a few words, what are some key keywords categorizing your business?
      </label>
      <Input
        name="words"
        className="mt-2 mb-6"
        value={words}
        onChange={(e) => setWords(e.target.value)}
      />

      <Button onClick={randomizeForm} className="border p-3 bg-gray-800">
        Randomize form
      </Button>

      <Button onClick={submitForm} className="border p-3 bg-gray-800">
        Suggest available domain names
      </Button>
    </form>
  );
};
