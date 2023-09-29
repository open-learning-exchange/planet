import dotenv from 'dotenv';
import OpenAI from 'openai';
import { DocumentInsertResponse } from 'nano';

import { ChatItem } from '../models/chat-item.model';
import { ChatMessage } from '../models/chat-message.model';
import { NanoCouchService } from '../utils/nano-couchdb';

dotenv.config();

const openai = new OpenAI();

const db = new NanoCouchService(
  process.env.COUCHDB_HOST || 'http://couchdb:5984',
  'chat_history',
);

// history = db.get the history | [] if empty;
const history: ChatItem[] = [];

export async function chatWithGpt(
  userInput: string,
  callback?: (response: string) => void): Promise<{
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
    const stream = await openai.chat.completions.create({
      'model': 'gpt-3.5-turbo',
      messages,
      'stream': true,
    });

    let completionText = '';

    // Handle streaming data
    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const response = chunk.choices[0].delta?.content || '';
        completionText += response;
        if (callback) {
          callback(response);
        }
      }
    }

    history.push({ 'query': userInput, 'response': completionText });
    db.conversations = history;
    const couchSaveResponse = await db.insert();

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
