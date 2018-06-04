import { PouchService } from './pouch.service';
import { AuthService } from './auth.service';
import { CoursesService } from './courses.service';

export { PouchService } from './pouch.service';
export { AuthService } from './auth.service';
export { CoursesService, Course, Step } from './courses.service';
export const SHARED_SERVICES = [ PouchService, AuthService ];
