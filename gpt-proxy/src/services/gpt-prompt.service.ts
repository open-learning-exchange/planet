import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';
import { DocumentInsertResponse } from 'nano';

import { ChatItem, ChatMessage } from '../models/chat.model';
import { NanoCouchService } from '../utils/nano-couchdb.service';

dotenv.config();

const configuration = new Configuration({
  'apiKey': process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const history: ChatItem[] = [];

const couch = new NanoCouchService('admin', history);

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

    const couchSaveResponse = await couch.save();

    return {
      completionText,
      history,
      couchSaveResponse
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`GPT Service Error: ${error.response.status} - ${error.response.data?.error?.code}`);
    } else {
      throw new Error(error.message);
    }
  }
}
