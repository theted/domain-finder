import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IndustriesSelect } from "./IndustriesSelect";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form as FormRoot,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const VITE_EVENTS_URL = import.meta.env.VITE_EVENTS_URL;

const FormSchema = z.object({
  words: z.string({
    required_error: "Please enter some keywords.",
  }),
  type: z.string({
    required_error: "Please select an occupation.",
  }),
});

type FormProps = {
  setIsLoading: (isLoading: boolean) => void;
};

export const Form = ({ setIsLoading }: FormProps) => {
  const [type, setType] = useState("");
  const [words, setWords] = useState("");

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  // TODO: get client id for socket.io - maybe wrap in a provider?

  // TODO: fix type
  const submitForm = async (e: any) => {
    if ("preventDefault" in e) {
      e.preventDefault();
    }

    console.log("POST =>", { type, words });
    setIsLoading(true);

    return fetch(VITE_EVENTS_URL + "/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, words }),
    });
  };

  const onSubmit = (e: any) => {
    e.preventDefault();
    console.log("SEND =>", { type, words });
  };

  return (
    <FormRoot {...form}>
      <form
        className="flex grow flex-grow flex-col"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="mt-3 mb-6">
          <p className="text-black">
            This is a tool for generating domain names for your business. Domain
            names are checked if reserved, so you can be sure that all
            suggestions are available domain names.
          </p>
        </div>

        <label className="text-black text-xl" htmlFor="type">
          What is your occupation?
        </label>

        <IndustriesSelect onValueChange={(value) => setType(value)} />

        <label className="text-black text-xl" htmlFor="words">
          In a few words, what are some key keywords describing the business?
        </label>

        <FormField
          control={form.control}
          name="words"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Words</FormLabel>
              <FormControl>
                <Input
                  placeholder="example: creative, fun, friendly"
                  {...field}
                />
              </FormControl>
              <FormDescription>Words</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Input
          name="words"
          className="mt-2 mb-6"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          required
        />

        <Button onClick={submitForm} className="border p-3 bg-gray-800">
          Suggest available domain names
        </Button>
      </form>
    </FormRoot>
  );
};
