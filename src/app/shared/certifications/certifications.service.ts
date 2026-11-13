import { Injectable } from '@angular/core';

import { CouchService } from '@shared/database/couchdb.service';

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
