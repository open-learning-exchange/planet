export interface DbDoc {
  _id: string;
  _rev: string;
  user: any;
  title: string;
  time: number;
  conversations: [];
}
