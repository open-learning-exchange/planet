import nano, {DocumentInsertResponse} from 'nano';
import {ChatItem, iChat} from '../models/chat.model';

const nanoDB = nano('http://localhost:2200/');
const db = nanoDB.use('chat_history');

export class NanoCouchService implements iChat {
  _id?: string;
  _rev?: string;
  user: string;
  conversations: ChatItem[];

  constructor(user: string, conversations: ChatItem[]) {
    this.user = user;
    this.conversations = conversations;
  }

  async processAPIResponse(response: DocumentInsertResponse): Promise<void> {
    if (response.ok === true) {
      this._id = response.id;
      this._rev = response.rev;
    }
  }

  async save(): Promise<DocumentInsertResponse> {
    try {
      const res = await db.insert(this);
      this.processAPIResponse(res);
      return res;
    } catch (error) {
      throw new Error(`Nano Service Error: ${error}`);
    }
  }
}
