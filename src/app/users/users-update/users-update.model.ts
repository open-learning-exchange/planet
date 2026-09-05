export interface UserAttachment {
  content_type: string;
  data?: string;
  digest?: string;
  length?: number;
  revpos?: number;
  stub?: boolean;
}

// TEMP NOTE (for review, strip before merge): opt in visibility for the contact fields that
// used to be readable by every logged in user. Absent on existing docs, which reads as opted
// out, so contacts stay private until their owner shares them.
export interface ContactVisibility {
  email: boolean;
  phoneNumber: boolean;
}

export interface UserDocument {
  _id?: string;
  _rev?: string;
  _attachments?: Record<string, UserAttachment>;
  name: string;
  roles: string[];
  age?: number;
  betaEnabled?: boolean;
  birthDate?: string | Date;
  contactVisibility?: ContactVisibility;
  birthYear?: number;
  email?: string;
  firstName?: string;
  gender?: string;
  language?: string;
  lastName?: string;
  level?: string;
  middleName?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}

export interface UsersUpdateFormValue {
  age: number | null;
  betaEnabled: boolean;
  birthDate: string | Date | null;
  birthYear: number | null;
  contactVisibility: ContactVisibility;
  email: string;
  firstName: string;
  gender: string;
  language: string;
  lastName: string;
  level: string;
  middleName: string;
  phoneNumber: string;
}

export type SubmissionUserPayload = Omit<UsersUpdateFormValue, 'birthYear' | 'contactVisibility'>;
