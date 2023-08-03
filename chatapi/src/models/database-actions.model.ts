import { DocumentGetResponse, DocumentInsertResponse } from 'nano';

export interface DatabaseActions {
  get(data: any): Promise<DocumentGetResponse>;
  insert(data: any): Promise<DocumentInsertResponse>;
}
