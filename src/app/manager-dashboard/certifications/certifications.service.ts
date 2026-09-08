import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { DialogsPromptService } from '../../shared/dialogs/dialogs-prompt.service';
import { dedupeShelfReduce } from '../../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class CertificationsService {

  readonly dbName = 'certifications';

  constructor(
    private couchService: CouchService,
    private dialogsPromptService: DialogsPromptService
  ) {}

  getCertifications() {
    return this.couchService.findAll(this.dbName);
  }

  getCertification(id: string) {
    return this.couchService.get(`${this.dbName}/${id}`);
  }

  openDeleteDialog(certification: any, callback) {
    const displayName = certification.name;
    this.dialogsPromptService.open({
      ...this.deleteCertification([ certification ].flat(), displayName, callback),
      changeType: 'delete',
      type: 'certification',
      displayName
    });
  }

  deleteCertification(certifications: any[], displayName, callback) {
    return {
      request: this.couchService.bulkDocs(this.dbName, certifications.map(m => ({ ...m, _deleted: true }))),
      onSuccess: (data) => callback(data.res),
      successMessage: $localize`You have deleted the ${displayName} certification`,
      errorMessage: $localize`There was a problem deleting this certification`
    };
  }

  addCertification(certification) {
    return this.couchService.updateDocument(this.dbName, { ...certification });
  }

  isCourseCompleted(course, user) {
    return course.doc.steps.length === course.progress
      .filter(step => step.userId === user._id && step.passed)
      .map(step => step.stepNum)
      .reduce(dedupeShelfReduce, []).length;
  }

}
