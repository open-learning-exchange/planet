import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import { environment } from '../../../../environments/environment';
import { PouchDBService } from './pouchDB.service';

@Injectable()
export class CoursesService {
  private localDB;

  constructor(private pouchDBService: PouchDBService) {
    this.localDB = this.pouchDBService.getLocalPouchDB();
  }

  getCourses() {
    return Observable.fromPromise(
      this.localDB.find({
        selector: {
          kind: 'Course'
        }
      })
    );
  }

  replicateRemoteCoursesToLocal() {
    return this.pouchDBService.replicateRemoteToLocal('courses');
  }

  private handleError(err) {
    console.error('An error occurred while fetching courses', err);
    return Observable.throw(err.message || err);
  }
}
