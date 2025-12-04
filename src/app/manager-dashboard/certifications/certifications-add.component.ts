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
import { Certification } from './certification.model';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

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
      }),
      templateUrl: ['']
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const id = params.get('id');
      if (id) {
        this.certificateInfo._id = id;
        this.certificationsService.getCertification(id).subscribe((certification: Certification) => {
          this.certificateForm.patchValue({
            name: certification.name || '',
            templateUrl: certification.templateUrl || ''
          });
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

  attachment: { file: File, name: string };

  onFileSelected(event) {
    const file: File = event.target.files[0];
    if (file) {
      this.attachment = { file: file, name: file.name };
    }
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

  submitCertificate(reroute: boolean) {
    if (!this.certificateForm.valid) {
      showFormErrors(this.certificateForm.controls);
      return;
    }
    const certificateFormValue: Certification = this.certificateForm.getRawValue();
    const certificateDoc = {
      ...this.certificateInfo,
      ...certificateFormValue,
      courseIds: this.courseIds
    };

    if (this.attachment) {
      certificateDoc._attachments = {
        [this.attachment.name]: {
          content_type: this.attachment.file.type,
          data: this.attachment.file
        }
      };
    }

    this.certificationsService.addCertification(certificateDoc).pipe(
      switchMap((res: any) => {
        this.certificateInfo = { _id: res.id, _rev: res.rev };
        if (this.attachment) {
          return this.certificationsService.getCertification(res.id).pipe(
            switchMap((cert: any) => {
              const updatedCert = { ...cert, templateUrl: `certifications/${res.id}/${this.attachment.name}` };
              return this.certificationsService.addCertification(updatedCert);
            })
          );
        }
        return of(res);
      })
    ).subscribe((res) => {
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
