import { Component, OnInit, ViewChild, AfterViewChecked, ChangeDetectorRef, HostListener } from '@angular/core';
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
import { environment } from '../../../environments/environment';
import { CanComponentDeactivate } from '../../shared/unsaved-changes.guard';
import { warningMsg } from '../../shared/unsaved-changes.component';

interface CertificationFormModel {
  name: string;
}

@Component({
  templateUrl: './certifications-add.component.html'
})
export class CertificationsAddComponent implements OnInit, AfterViewChecked, CanComponentDeactivate {

  readonly dbName = 'certifications';
  certificateInfo: { _id?: string, _rev?: string } = {};
  certificateForm: FormGroup;
  courseIds: string[] = [];
  pageType = 'Add';
  disableRemove = true;
  selectedFile: any; // Will hold base64 string for new files
  previewSrc: any = 'assets/image.png'; // For image preview
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';

  initialFormValues: any;
  attachmentChanged = false;
  isFormInitialized = false;

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
          this.initialFormValues = { ...this.certificateForm.value };
          this.certificateInfo._rev = certification._rev;
          this.courseIds = certification.courseIds || [];
          this.pageType = 'Update';
          if (certification._attachments && certification._attachments.attachment) {
            // Construct direct URL for the preview
            this.previewSrc = `${this.urlPrefix}${id}/attachment`;
          }
          this.isFormInitialized = true;
          this.setupFormValueChanges();
        });
      } else {
        this.initialFormValues = { ...this.certificateForm.value };
        this.isFormInitialized = true;
        this.setupFormValueChanges();
      }
    });
  }

  setupFormValueChanges() {
    this.certificateForm.valueChanges.subscribe(() => {
      // The guard will check for changes, no need to set a flag here
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
      data: { file: this.previewSrc } // Pass previewSrc to the dialog
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === undefined) {
        return; // Dialog was closed without action
      }
      this.attachmentChanged = true; // Any confirmed action in the dialog is a change
      if (result instanceof File) {
        // New file selected, convert to base64
        const reader = new FileReader();
        reader.onload = () => {
          this.selectedFile = reader.result as string;
          this.previewSrc = this.selectedFile;
        };
        reader.readAsDataURL(result);
      } else if (result === null) {
        // Image removed
        this.selectedFile = null;
        this.previewSrc = 'assets/image.png';
      }
    });
  }

  submitCertificate(reroute: boolean) {
    if (!this.certificateForm.valid) {
      showFormErrors(this.certificateForm.controls);
      return;
    }
    const certificateFormValue: CertificationFormModel = this.certificateForm.getRawValue();
    const certData: any = {
      ...this.certificateInfo,
      ...certificateFormValue,
      courseIds: this.courseIds,
    };

    if (this.selectedFile && this.selectedFile.startsWith('data:')) {
      // New base64 image data is present
      const imgDataArr: string[] = this.selectedFile.split(/;\w+,/);
      const contentType: string = imgDataArr[0].replace(/data:/, '');
      const data: string = imgDataArr[1];
      certData._attachments = {
        'attachment': {
          'content_type': contentType,
          'data': data
        }
      };
    } else if (this.attachmentChanged && !this.selectedFile) {
        // This means the image was removed
        if (certData._attachments) {
            delete certData._attachments;
        }
    }


    this.certificationsService.addCertification(certData).subscribe((res) => {
      this.certificateInfo = { _id: res.id, _rev: res.rev };
      this.initialFormValues = { ...this.certificateForm.value };
      this.attachmentChanged = false;
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

  canDeactivate(): boolean {
    return !this.getHasUnsavedChanges();
  }

  isFormPristine(): boolean {
    return JSON.stringify(this.certificateForm.value) === JSON.stringify(this.initialFormValues);
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.getHasUnsavedChanges()) {
      $event.returnValue = warningMsg;
    }
  }

  private getHasUnsavedChanges(): boolean {
    if (!this.isFormInitialized) {
        return false;
    }
    return !this.isFormPristine() || this.attachmentChanged;
  }
}
