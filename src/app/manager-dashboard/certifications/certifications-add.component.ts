import { Component, OnInit, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { CustomValidators } from '../../validators/custom-validators';
import { CertificationsService } from './certifications.service';
import { DialogsAddTableComponent } from '../../shared/dialogs/dialogs-add-table.component';
import { CoursesComponent } from '../../courses/courses.component';
import { showFormErrors } from '../../shared/table-helpers';
import { ValidatorService } from '../../validators/validator.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

interface CertificationFormModel {
  name: string;
}

@Component({
  templateUrl: './certifications-add.component.html'
})
export class CertificationsAddComponent implements OnInit, AfterViewChecked {

  readonly dbName = 'certifications';
  certificateInfo: { _id?: string, _rev?: string } = {};
  certificateForm: FormGroup;
  courseIds: string[] = [];
  pageType = 'Add';
  disableRemove = true;
  previewUrl: any;
  selectedFile: any;
  @ViewChild(CoursesComponent) courseTable: CoursesComponent;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private certificationsService: CertificationsService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private cdRef: ChangeDetectorRef
  ) {
    this.certificateForm = this.fb.group({
      name: this.fb.nonNullable.control('', {
        validators: CustomValidators.required,
        asyncValidators: ac => this.validatorService.isUnique$(this.dbName, 'name', ac, {
          selectors: { _id: { '$ne': this.certificateInfo._id || '' } }
        })
      })
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const id = params.get('id');
      if (id) {
        this.certificateInfo._id = id;
        this.certificationsService.getCertification(id).subscribe(certification => {
          this.certificateForm.patchValue({ name: certification.name || '' } as Partial<CertificationFormModel>);
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

  ngAfterViewChecked() {
    const disableRemove = !this.courseTable || !this.courseTable.selection.selected.length;
    if (this.disableRemove !== disableRemove) {
      this.disableRemove = disableRemove;
      this.cdRef.detectChanges();
    }
  }

  goBack() {
    const navigation = this.pageType === 'Update' ? '../..' : '..';
    this.router.navigate([ navigation ], { relativeTo: this.route });
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files[0]) {
      this.selectedFile = event.target.files[0];
      const reader = new FileReader();
      reader.onload = e => this.previewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  submitCertificate(reroute: boolean) {
    if (!this.certificateForm.valid) {
      showFormErrors(this.certificateForm.controls);
      return;
    }
    const certificateFormValue: CertificationFormModel = this.certificateForm.getRawValue();
    this.certificationsService.addCertification({
      ...this.certificateInfo,
      ...certificateFormValue,
      courseIds: this.courseIds,
      attachment: this.selectedFile
    }).subscribe((res) => {
      this.certificateInfo = { _id: res.id, _rev: res.rev };
      this.planetMessageService.showMessage(
        this.pageType === 'Add' ? $localize`New certification added` : $localize`Certification updated`
      );
      if (reroute) {
        this.goBack();
      }
    });
  }

  openCourseDialog() {
    const initialCourseIds = this.courseIds || [];
    const dialogRef = this.dialog.open(DialogsAddTableComponent, {
      width: '80vw',
      data: {
        okClick: (courses: any[]) => {
          this.courseIds = [ ...this.courseIds, ...courses.map(course => course._id) ];
          dialogRef.close();
        },
        noSpinner: true,
        mode: 'courses',
        excludeIds: initialCourseIds
      }
    });
  }

  removeCourses() {
    this.courseIds = this.courseIds.filter(id => this.courseTable.selection.selected.indexOf(id) === -1);
  }

}
