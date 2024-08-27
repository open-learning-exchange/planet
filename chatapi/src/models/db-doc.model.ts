export interface DbDoc {
  _id: string;
  _rev: string;
  user: any;
  title: string;
  createdDate: number;
  aiProvider: string;
  conversations: [];
}

export interface Attachment {
  content_type: string;
  revpos: number;
  digest: string;
  length: number;
  stub: boolean;
}
