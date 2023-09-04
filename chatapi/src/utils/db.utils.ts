import db from '../config/nano.config';
import { DbDoc } from '../models/db-doc.model';

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
