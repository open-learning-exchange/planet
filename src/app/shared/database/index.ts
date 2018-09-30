import { PouchService } from './pouch.service';
import { PouchAuthService } from './pouch-auth.service';
import { FeedbackService } from './feedback.service';

export { PouchService } from './pouch.service';
export { PouchAuthService } from './pouch-auth.service';
export { FeedbackService } from './feedback.service';
export const SHARED_SERVICES = [ PouchService, PouchAuthService, FeedbackService ];
