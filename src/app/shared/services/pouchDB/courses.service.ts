import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import { environment } from '../../../../environments/environment';
import { PouchDBService } from './pouchDB.service';
import { map } from 'rxjs/operators';

interface Step {
  stepTitle: string;
  description: string;
  attachment: string;
}

// @TODO: Add more fields from the database
export interface Course {
  _id: String;
  _rev: String;
  kind: string;
  languageOfInstruction: string;
  courseTitle: string;
  memberLimit: number;
  description: String;
  method: string;
  gradeLevel: string;
  subjectLevel: string;
  steps: Step[];
  createdAt: number;
}

@Injectable()
export class CoursesService {
  private localDB;

  constructor(private pouchDBService: PouchDBService) {
    this.localDB = this.pouchDBService.getLocalPouchDB();
  }

  getCourses(): Observable<Course[]> {
    // need to use gte because some documents do not have createdAt field
    return Observable.fromPromise(
      this.localDB.find({
        selector: {
          kind: 'Course',
          createdAt: { $gte: null }
        },
        sort: [{ kind: 'desc' }, { createdAt: 'desc' }]
      })
    ).pipe(map((data: { docs: Course[] }) => data.docs));
  }

  replicateRemoteCoursesToLocal() {
    return this.pouchDBService.replicateRemoteToLocal('courses');
  }

  private handleError(err) {
    console.error('An error occurred while fetching courses', err);
    return Observable.throw(err.message || err);
  }
}
