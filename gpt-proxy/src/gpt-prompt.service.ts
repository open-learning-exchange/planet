import { Configuration, OpenAIApi } from "openai";
import dotenv from 'dotenv';

dotenv.config();

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HistoryItem {
  query: string;
  response: string;
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const history: HistoryItem[] = [];

export async function chatWithGpt(user_input: string): Promise<{ completionText: string, history: HistoryItem[] } | undefined> {
  const messages: Message[] = [];
  for (const {query, response} of history) {
    messages.push({ role: "user", content: query });
    messages.push({ role: "assistant", content: response });
  }

  messages.push({ role: "user", content: user_input });

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });

    if (!completion.data.choices[0]?.message?.content) {
      throw new Error("Unexpected API response");
    }

    const completion_text = completion.data.choices[0]?.message?.content;

    history.push({ query: user_input, response: completion_text });

    return {
      completionText: completion_text,
      history
    };
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
      throw new Error(`GPT Service Error: ${error.response.status} - ${error.response.data?.error?.code}`);
    } else {
      console.log(error.message);
      throw new Error(error.message);
    }
  }
}
