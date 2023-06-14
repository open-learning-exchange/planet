import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

interface Message {
  role: "user" | "assistant";
  content: string;
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const history: Array<[string, string]> = [];

export async function chatWithGpt(user_input: string): Promise<string | undefined> {
  const messages: Message[] = [];
  for (const [input_text, completion_text] of history) {
    messages.push({ role: "user", content: input_text });
    messages.push({ role: "assistant", content: completion_text });
  }

  messages.push({ role: "user", content: user_input });

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
    });

    if (!completion.data.choices[0]?.message?.content) {
      throw new Error("Unexpected API response");
    }

    const completion_text = completion.data.choices[0]?.message?.content;

    history.push([user_input, completion_text]);

    return completion_text;
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
}
