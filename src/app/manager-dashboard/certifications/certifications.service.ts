import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';
import { dedupeShelfReduce } from '../../shared/utils';
import { CoursesService } from '../../courses/courses.service';
import { UsersService } from '../../users/users.service';
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AwardedCertificate } from '../../users/users-achievements/awarded-certificate.model';
import { Certification } from './certification.model';

@Injectable({
  providedIn: 'root'
})
export class CertificationsService {

  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  readonly dbName = 'certifications';

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService,
    private usersService: UsersService
  ) {}

  getCertifications() {
    return this.couchService.findAll(this.dbName);
  }

  getCertification(id: string) {
    return this.couchService.get(`${this.dbName}/${id}`);
  }

  openDeleteDialog(certification: any, callback) {
    const displayName = certification.name;
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCertification([ certification ].flat(), displayName, callback),
        changeType: 'delete',
        type: 'certification',
        displayName
      }
    });
  }

  deleteCertification(certifications: any[], displayName, callback) {
    return {
      request: this.couchService.bulkDocs(this.dbName, certifications.map(m => ({ ...m, _deleted: true }))),
      onNext: (data) => {
        callback(data.res);
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted the ${displayName} certification`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this certification`)
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

  checkAndAwardCertificates(userId: string) {
    this.getCertifications().pipe(
      switchMap((certifications: Certification[]) => {
        return this.usersService.usersListener(true).pipe(
          map(users => users.find(u => u._id === userId)),
          switchMap(user => {
            if (user) {
              const userCourses = this.coursesService.local.courses.filter(c => c.progress.length > 0);
              for (const certification of certifications) {
                const requiredCourses = certification.courseIds.map(courseId => {
                  const course = userCourses.find(c => c._id === courseId);
                  return course ? { ...course, doc: course } : undefined;
                });
                if (requiredCourses.every(course => course && this.isCourseCompleted(course, user.doc))) {
                  this.couchService.findAll('awarded_certificates').pipe(
                    map((awarded: AwardedCertificate[]) => {
                      return awarded.find(a => a.certificationId === certification._id && a.userId === userId);
                    }),
                    switchMap(existing => {
                      if (!existing) {
                        const newCertificate: AwardedCertificate = {
                          certificationId: certification._id,
                          userId: userId,
                          status: 'pending',
                          fullName: `${user.doc.firstName} ${user.doc.lastName}`,
                          courseName: certification.name,
                          templateUrl: certification.templateUrl
                        };
                        return this.couchService.updateDocument('awarded_certificates', newCertificate);
                      }
                      return of(null);
                    })
                  ).subscribe();
                }
              }
            }
            return of(null);
          })
        );
      })
    ).subscribe();
  }

}
