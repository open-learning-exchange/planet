import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material';
import { CustomValidators } from '../../validators/custom-validators';
import { CertificationsService } from './certifications.service';
import { DialogsAddCoursesComponent } from '../../shared/dialogs/dialogs-add-courses.component';
import { CoursesComponent } from '../../courses/courses.component';
import { showFormErrors } from '../../shared/table-helpers';
import { ValidatorService } from '../../validators/validator.service';

@Component({
  templateUrl: './certifications-add.component.html'
})
export class CertificationsAddComponent implements OnInit {

  readonly dbName = 'certifications';
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
    private certificationsService: CertificationsService,
    private validatorService: ValidatorService
  ) {
    this.certificateForm = this.fb.group({ name: [
      '',
      CustomValidators.required,
      ac => this.validatorService.isUnique$(this.dbName, 'name', ac, { selectors: { _id: { '$ne': this.certificateInfo._id || '' } } })
    ] });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const id = params.get('id');
      if (id) {
        this.certificateInfo._id = id;
        this.certificationsService.getCertification(id).subscribe(certification => {
          this.certificateForm.patchValue(certification);
          this.certificateInfo._rev = certification._rev;
          this.courseIds = certification.courseIds || [];
          this.pageType = 'Update';
        });
      } else {
        this.certificateInfo._id = undefined;
        this.courseIds = [];
      }
    });
  }

  goBack() {
    const navigation = this.pageType === 'Update' ? '../..' : '..';
    this.router.navigate([ navigation ], { relativeTo: this.route });
  }

  submitCertificate(reroute) {
    if (!this.certificateForm.valid) {
      showFormErrors(this.certificateForm.controls);
      return;
    }
    this.certificationsService.addCertification({
      ...this.certificateInfo, ...this.certificateForm.value, courseIds: this.courseIds
    }).subscribe((res) => {
      this.certificateInfo = { _id: res.id, _rev: res.rev };
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
