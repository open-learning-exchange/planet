import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material';
import { CustomValidators } from '../../validators/custom-validators';
import { CertificationsService } from './certifications.service';
import { DialogsAddCoursesComponent } from '../../shared/dialogs/dialogs-add-courses.component';
import { CoursesComponent } from '../../courses/courses.component';
import { showFormErrors } from '../../shared/table-helpers';

@Component({
  templateUrl: './certifications-add.component.html'
})
export class CertificationsAddComponent implements OnInit {

  certificateInfo: { _id?: string, _rev?: string } = {};
  certificateForm: FormGroup;
  courseIds: any[] = [];
  pageType = 'Add';
  @ViewChild(CoursesComponent, { static: false }) courseTable: CoursesComponent;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private certificationsService: CertificationsService
  ) {
    this.certificateForm = this.fb.group({ name: [ '', CustomValidators.required, this.certificationsService.nameValidator('') ] });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const id = params.get('id');
      if (id) {
        this.certificateInfo._id = id;
        this.certificationsService.getCertification(id).subscribe(certification => {
          this.certificateForm.controls.name.setAsyncValidators(this.certificationsService.nameValidator(certification.name));
          this.certificateForm.patchValue(certification);
          this.certificateInfo._rev = certification._rev;
          this.courseIds = certification.courseIds || [];
          this.pageType = 'Update';
        });
      } else {
        this.certificateInfo._id = undefined;
        this.certificateForm.reset();
        this.courseIds = [];
      }
    });
  }

  goBack() {
    const navigation = this.certificateInfo._id ? '../..' : '..';
    this.router.navigate([ navigation ], { relativeTo: this.route });
  }

  submitCertificate(reroute) {
    if (!this.certificateForm.valid) {
      showFormErrors(this.certificateForm.controls);
      return;
    }
    this.certificationsService.addCertification({
      ...this.certificateInfo, ...this.certificateForm.value, courseIds: this.courseIds
    }).subscribe(() => {
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
