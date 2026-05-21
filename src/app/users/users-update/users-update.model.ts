import { UsersProfileFormValue, UsersProfileSubmissionPayload } from '../../shared/forms/users-profile-form.helpers';

export interface UserAttachment {
  content_type: string;
  data?: string;
  digest?: string;
  length?: number;
  revpos?: number;
  stub?: boolean;
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

export type UsersUpdateFormValue = UsersProfileFormValue;

export type SubmissionUserPayload = UsersProfileSubmissionPayload;
