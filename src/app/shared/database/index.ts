import { PouchService } from './pouch.service';
import { PouchAuthService } from './pouch-auth.service';

export { PouchService } from './pouch.service';
export { PouchAuthService } from './pouch-auth.service';
export const SHARED_SERVICES = [ PouchService, PouchAuthService ];
