import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';

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
    return course.doc.steps.every((_, index) => course.progress.some(step =>
      step.userId === user._id && step.stepNum === index + 1 && step.passed));
  }

}
