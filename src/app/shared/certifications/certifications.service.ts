import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { findDocuments } from '@shared/database/mango-queries';

@Injectable({
  providedIn: 'root'
})
export class CertificationsService {

  readonly dbName = 'certifications';

  constructor(
    private couchService: CouchService
  ) {}

  getCertifications() {
    return this.couchService.findAll(this.dbName);
  }

  getCertification(id: string) {
    return this.couchService.get(`${this.dbName}/${id}`);
  }

  // Posts directly because findAll turns a failed request into an empty list
  certificationsRequiring(courseIds: string[]) {
    return this.couchService.post(`${this.dbName}/_find`, findDocuments({ courseIds: { $elemMatch: { $in: courseIds } } }))
      .pipe(map(({ docs }) => docs));
  }

  // _all_docs returns a row per key: a course that never existed has an error, a deleted one has value.deleted
  deletedCourseIds(courseIds: string[]) {
    return this.couchService.post('courses/_all_docs', { keys: courseIds }).pipe(
      map(({ rows }) => rows.filter(row => row.error || row.value.deleted).map(row => row.key))
    );
  }

  isCourseCompleted(course, user) {
    return course.doc.steps?.length > 0 && course.doc.steps.every((_, index) => course.progress.some(step =>
      step.userId === user._id && step.stepNum === index + 1 && step.passed));
  }

  certifiedUsers(certification, courses: any[], progress: any[], users: any[]) {
    const certificateCourses = certification.courseIds.map(courseId => courses.find(course => course._id === courseId));
    if (certificateCourses.length === 0 || certificateCourses.includes(undefined)) {
      return [];
    }
    const coursesWithProgress = certificateCourses
      .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
    return users.filter(user => coursesWithProgress.every(course => this.isCourseCompleted(course, user)));
  }

}
