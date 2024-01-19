export interface ConversationForm {
  _id: string;
  _rev: string;
  user: string;
  content: string;
}

export interface Conversation {
  _id: string;
  _rev: string;
  user: string;
  conversations: Message[];
  title: string;
  createdDate: number;
  updatedDate: number;
}

export interface Message {
  query: string;
  response: string;
}
