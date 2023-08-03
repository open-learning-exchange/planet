import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import nano, { DocumentInsertResponse } from 'nano';

import { DbDoc } from '../models/db-doc.model';
import { ChatMessage } from '../models/chat-message.model';

dotenv.config();

// Initialize OpenAI API
const configuration = new Configuration({
  'apiKey': process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize CouchDB
const db = nano(process.env.COUCHDB_HOST || 'http://couchdb:5984').use(
  'chat_history',
);


/**
 * Retrieves chat history from CouchDB for a given document ID.
 * @param id - Document ID
 * @returns Array of chat conversations
 */
export async function getChatDocument(id: string) {
  try {
    const res = await db.get(id) as DbDoc;
    return res.conversations;
    // Should return user, team data as well particularly for the /conversations endpoint
  } catch (error) {
    return [];
  }
}


/**
 * Initiates a conversation with the GPT model.
 * @param data - Chat data including content and additional information
 * @returns Object with completion text and CouchDB save response
 */
export async function chatWithGpt(data: any): Promise<{
  completionText: string;
  couchSaveResponse: DocumentInsertResponse;
} | undefined> {
  const { content, user, time, teamId, teamType, ...dbData } = data;
  const messages: ChatMessage[] = [];

  if(dbData._id) {
    const history = await getChatDocument(dbData._id);
    dbData.conversations = history;

    for (const { query, response } of history) {
      messages.push({ 'role': 'user', 'content': query });
      messages.push({ 'role': 'assistant', 'content': response });
    }
  } else {
    dbData.conversations = [];
    dbData.user = user;
    dbData.time = time;

    if(teamId) dbData.teamId = teamId;
    if(teamType) dbData.teamType = teamType;
  }

  dbData.conversations.push({ 'query': content, 'response': '' });
  const res = await db.insert(dbData);

  messages.push({ 'role': 'user', content });

  try {
    const completion = await openai.createChatCompletion({
      'model': 'gpt-3.5-turbo',
      messages,
    });

    const completionText = completion.data.choices[0]?.message?.content;
    if(!completionText) throw new Error('Unexpected API response');

    dbData.conversations.pop();
    dbData.conversations.push({ 'query': content, 'response': completionText });

    dbData._id = res?.id;
    dbData._rev = res?.rev;
    const couchSaveResponse = await db.insert(dbData);

    return {
      completionText,
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
