import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import { environment } from '../../../../environments/environment';
import { PouchDBService } from './pouchDB.service';

@Injectable()
export class CoursesService {
  private baseUrl = environment.couchAddress;
  private coursesDB;

  constructor(private pouchDBService: PouchDBService) {
    this.coursesDB = this.pouchDBService.getLocalPouchDB();
  }

  replicateRemoteCoursesToLocal() {
    return this.pouchDBService.replicateRemoteToLocal('courses');
  }

  private handleError(err) {
    console.error('An error occurred while fetching courses', err);
    return Observable.throw(err.message || err);
  }
}
