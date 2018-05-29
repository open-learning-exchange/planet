import { PouchService } from './pouch.service';
import { AuthService } from './auth.service';

export { PouchService } from './pouch.service';
export { AuthService } from './auth.service';

export const SHARED_SERVICES = [ PouchService, AuthService ];
