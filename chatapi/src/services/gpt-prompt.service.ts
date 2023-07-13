import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { DocumentInsertResponse } from 'nano';

import { ChatItem } from '../models/chat-item.model';
import { ChatMessage } from '../models/chat-message.model';
import { NanoCouchService } from '../utils/nano-couchdb';

dotenv.config();

const configuration = new Configuration({
  'apiKey': process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const db = new NanoCouchService(
  process.env.COUCHDB_HOST || 'http://localhost:2200/',
  process.env.COUCHDB_NAME || 'chat_history',
);

// history = db.get the history | [] if empty;
const history: ChatItem[] = [];

export async function chatWithGpt(userInput: string): Promise<{
  completionText: string;
  history: ChatItem[];
  couchSaveResponse: DocumentInsertResponse;
} | undefined> {
  const messages: ChatMessage[] = [];

  for (const { query, response } of history) {
    messages.push({ 'role': 'user', 'content': query });
    messages.push({ 'role': 'assistant', 'content': response });
  }

  messages.push({ 'role': 'user', 'content': userInput });
  // Should insert query to db here

  try {
    const completion = await openai.createChatCompletion({
      'model': 'gpt-3.5-turbo',
      messages,
    });

    if (!completion.data.choices[0]?.message?.content) {
      throw new Error('Unexpected API response');
    }

    const completionText = completion.data.choices[0]?.message?.content;
    history.push({ 'query': userInput, 'response': completionText });

    db.conversations = history;
    const couchSaveResponse = await db.insert();
    // Should update the db with query response here

    return {
      completionText,
      history,
      couchSaveResponse
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(`GPT Service Error: ${error.response.status} - ${error.response.data?.error?.code}`);
    } else {
      throw new Error(error.message);
    }
  }
}
