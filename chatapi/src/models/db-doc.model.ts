export interface DbDoc {
  _id: string;
  _rev: string;
  user: string;
  time: number;
  conversations: [];
}
