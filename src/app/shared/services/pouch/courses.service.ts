
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { map } from 'rxjs/operators';
import 'rxjs/add/observable/fromPromise';
import { PouchService } from './pouch.service';

interface Step {
  stepTitle: string;
  description: string;
  attachment: string;
}

// @TODO: Add more fields from the database
export interface Course {
  _id: string;
  _rev: string;
  kind: string;
  languageOfInstruction: string;
  courseTitle: string;
  memberLimit: number;
  description: String;
  method: string;
  gradeLevel: string;
  subjectLevel: string;
  steps: Step[];
  createdDate: number;
  admission: boolean;
}

@Injectable()
export class CoursesService {
  private localDB;

  constructor(private pouchDBService: PouchService) {
    this.localDB = this.pouchDBService.getLocalPouchDB();
  }

  getCourses(): Observable<Course[]> {
    return Observable.fromPromise(
      this.localDB.find({
        selector: {
          pouchIndex: 'courses',
          createdDate: { $gte: null }
        },
        sort: [ { pouchIndex: 'desc' }, { createdDate: 'desc' } ]
      })
    ).pipe(map((data: { docs: Course[] }) => data.docs));
  }

  getCourse(id): Observable<Course> {
    return Observable.fromPromise(this.localDB.get(id));
  }

  updateCourses() {
    return this.pouchDBService.replicateFromRemoteDB('courses');
  }

  private handleError(err) {
    console.error('An error occurred while fetching courses', err);
    return ErrorObservable.create(err.message || err);
  }
}
