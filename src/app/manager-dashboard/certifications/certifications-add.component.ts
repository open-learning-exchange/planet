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
import { ImagePreviewDialogComponent } from '../../shared/dialogs/image-preview-dialog.component';
import { switchMap } from 'rxjs/operators';

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
          // Load attachment from CouchDB if it exists
          if (certification._attachments && certification._attachments.attachment) {
            this.certificationsService.getAttachment(id, 'attachment').subscribe(blob => {
              this.selectedFile = new File([blob], 'attachment'); // Create a File object
            });
          }
        });
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

  openImagePreviewDialog() {
    const dialogRef = this.dialog.open(ImagePreviewDialogComponent, {
      data: { file: this.selectedFile }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.selectedFile = result;
        // If it's a new certification (no _id from route), create a draft.
        if (!this.route.snapshot.paramMap.get('id')) {
          // If no doc exists yet, create one
          if (!this.certificateInfo._id || this.certificateInfo._id.startsWith('temp-')) {
            this.certificationsService.createDraftCertification().pipe(
              switchMap((res: any) => {
                this.certificateInfo = { _id: res.id, _rev: res.rev };
                return this.certificationsService.uploadAttachment(res.id, res.rev, this.selectedFile);
              })
            ).subscribe(uploadRes => {
              this.certificateInfo._rev = uploadRes.rev; // Update rev after attachment upload
              this.planetMessageService.showMessage($localize`Draft saved.`);
            });
          } else { // Draft doc already exists, just upload attachment
            this.certificationsService.uploadAttachment(this.certificateInfo._id, this.certificateInfo._rev, this.selectedFile)
              .subscribe(uploadRes => {
                this.certificateInfo._rev = uploadRes.rev;
                this.planetMessageService.showMessage($localize`Draft updated.`);
              });
          }
        } else { // Existing certification, just upload the new attachment
          this.certificationsService.uploadAttachment(this.certificateInfo._id, this.certificateInfo._rev, this.selectedFile)
            .subscribe(uploadRes => {
              this.certificateInfo._rev = uploadRes.rev;
              this.planetMessageService.showMessage($localize`Attachment updated.`);
            });
        }
      }
    });
  }

  submitCertificate(reroute: boolean) {
    if (!this.certificateForm.valid) {
      showFormErrors(this.certificateForm.controls);
      return;
    }
    const certificateFormValue: CertificationFormModel = this.certificateForm.getRawValue();
    const certData = {
      ...this.certificateInfo,
      ...certificateFormValue,
      courseIds: this.courseIds,
      type: 'certification' // Ensure type is 'certification', not 'draft'
    };
    // The attachment is already in CouchDB, so we just update the document fields.
    this.certificationsService.addCertification(certData).subscribe((res) => {
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
