import { DocumentInsertResponse } from 'nano';
import { DatabaseActions } from '../models/database-actions.model';

export class NanoCouchService implements DatabaseActions {
  _id?: string;
  _rev?: string;
  [key: string]: any;
  private db: DatabaseActions;

  constructor(db: DatabaseActions) {
    this.db = db;
  }

  async processAPIResponse(response: DocumentInsertResponse): Promise<void> {
    if (response.ok === true) {
      this._id = response.id;
      this._rev = response.rev;
    }
  }

  async insert(): Promise<DocumentInsertResponse> {
    try {
      const res = await this.db.insert(this);
      this.processAPIResponse(res);
      return res;
    } catch (error) {
      throw new Error(`Nano Service Error: ${error}`);
    }
  }
}
