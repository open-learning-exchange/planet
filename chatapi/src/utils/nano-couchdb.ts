import nano, { DocumentGetResponse, DocumentInsertResponse } from 'nano';
import { DatabaseActions } from '../models/database-actions.model';

export class NanoCouchService implements DatabaseActions {
  _id?: string;
  _rev?: string;
  [key: string]: any;
  private db: DatabaseActions;

  constructor(databaseUrl: string, databaseName: string) {
    const nanoDB = nano(databaseUrl);
    this.db = nanoDB.use(databaseName);
  }

  async processAPIResponse(response: DocumentInsertResponse): Promise<void> {
    if (response.ok === true) {
      this._id = response.id;
      this._rev = response.rev;
    }
  }

  async get(): Promise<DocumentGetResponse> {
    try {
      if (!this._id) {
        throw new Error('Cannot get without _id property.');
      }

      const res = await this.db.get(this._id);
      // this.processAPIResponse(res);
      return res;
    } catch (error) {
      throw new Error(`Nano Service Error: ${error}`);
    }
  }

  async insert(): Promise<DocumentInsertResponse> {
    try {
      const { db, ...document } = this; // eslint-disable-line @typescript-eslint/no-unused-vars
      const res = await this.db.insert(document);
      // this.processAPIResponse(res);
      return res;
    } catch (error) {
      throw new Error(`Nano Service Error: ${error}`);
    }
  }

  // id: any, rev: any
  async update() {
    try {
      if (!this._id || !this._rev) {
        throw new Error('Cannot update without _id and _rev properties.');
      }

      const { db, ...document } = this; // eslint-disable-line @typescript-eslint/no-unused-vars
      const res = await this.db.insert(document);
      // this.processAPIResponse(res);
      return res;
    } catch (error) {
      throw new Error(`Nano Service Error: ${error}`);
    }
  }
}
