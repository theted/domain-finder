import OpenAI from "openai";

const openai = new OpenAI();

export const openAiPrompt = async (prompt: string): Promise<string | null> => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
};
