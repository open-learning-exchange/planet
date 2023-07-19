import { DocumentInsertResponse } from 'nano';

export interface DatabaseActions {
  insert(data: any): Promise<DocumentInsertResponse>;
}
