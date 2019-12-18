import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material';
import { CustomValidators } from '../../validators/custom-validators';
import { CertificationsService } from './certifications.service';
import { DialogsAddCoursesComponent } from '../../shared/dialogs/dialogs-add-courses.component';
import { CoursesComponent } from '../../courses/courses.component';

@Component({
  templateUrl: './certifications-add.component.html'
})
export class CertificationsAddComponent {

  certificateForm: FormGroup;
  courseIds: any[] = [];
  @ViewChild(CoursesComponent, { static: false }) courseTable: CoursesComponent;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private certificationsService: CertificationsService
  ) {
    this.certificateForm = this.fb.group({ name: [ '', CustomValidators.required ] });
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  submitCertificate(reroute) {
    if (!this.certificateForm.valid) {
      Object.keys(this.certificateForm.controls).forEach(fieldName => {
        this.certificateForm.controls[fieldName].markAsTouched({ onlySelf: true });
      });
      return;
    }
    this.certificationsService.addCertification({ ...this.certificateForm.value, courseIds: this.courseIds }).subscribe(() => {
      if (reroute) {
        this.goBack();
      }
    });
  }

  openCourseDialog() {
    const initialCourseIds = this.courseIds || [];
    const dialogRef = this.dialog.open(DialogsAddCoursesComponent, {
      width: '80vw',
      data: {
        okClick: (courses: any[]) => {
          this.courseIds = [ ...this.courseIds, ...courses.map(course => course._id) ];
          dialogRef.close();
        },
        noSpinner: true,
        excludeIds: initialCourseIds
      }
    });
  }

  removeCourses() {
    this.courseIds = this.courseIds.filter(id => this.courseTable.selection.selected.indexOf(id) === -1);
  }

}
