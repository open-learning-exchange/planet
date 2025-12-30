import { Component, HostListener, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, NonNullableFormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { switchMap } from 'rxjs/operators';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { UserService } from '../../shared/user.service';
import { environment } from '../../../environments/environment';
import { languages } from '../../shared/languages';
import { CustomValidators } from '../../validators/custom-validators';
import { StateService } from '../../shared/state.service';
import { ValidatorService } from '../../validators/validator.service';
import { showFormErrors } from '../../shared/table-helpers';
import { educationLevel } from '../user-constants';
import { CanComponentDeactivate } from '../../shared/unsaved-changes.guard';
import { warningMsg } from '../../shared/unsaved-changes.component';
import { CouchService } from '../../shared/couchdb.service';
import { SubmissionUserPayload, UserAttachment, UserDocument, UsersUpdateFormValue } from './users-update.model';

interface UsersUpdateFormGroup {
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  language: FormControl<string>;
  phoneNumber: FormControl<string>;
  birthDate: FormControl<string | Date | null>;
  birthYear: FormControl<number | null>;
  age: FormControl<number | null>;
  gender: FormControl<string>;
  level: FormControl<string>;
  betaEnabled: FormControl<boolean>;
}

@Component({
  templateUrl: './users-update.component.html',
  styleUrls: [ './users-update.scss' ]
})
export class UsersUpdateComponent implements OnInit, CanComponentDeactivate {
  user: UserDocument = { name: '', roles: [] };
  initialFormValues: UsersUpdateFormValue | null = null;
  educationLevel = educationLevel;
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup<UsersUpdateFormGroup>;
  currentImgKey: string | null = null;
  currentProfileImg = 'assets/image.png';
  previewSrc = 'assets/image.png';
  uploadImage = false;
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  urlName = '';
  redirectUrl = '/';
  file: string | null = null;
  title = '';
  roles: string[] = [];
  languages = languages;
  submissionMode = false;
  showAdditionalFields = false;
  planetConfiguration = this.stateService.configuration;
  minBirthDate: Date = this.userService.minBirthDate;
  hasUnsavedChanges = false;
  avatarChanged = false;
  attachmentDeleted = false;
  originalAttachments: Record<string, UserAttachment> | null = null;
  isFormInitialized = false;
  imageChangedEvent: Event | null = null;
  showImagePreview = true;
  @ViewChild('imageEditDialog') imageEditDialog: TemplateRef<any>;

  constructor(
    private fb: NonNullableFormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private stateService: StateService,
    private validatorService: ValidatorService,
    private dialog: MatDialog
  ) {
    this.userData();
    const nav = this.router.getCurrentNavigation();
    this.title = nav?.extras?.state?.['title'] || '';
  }

  ngOnInit() {
    const routeSnapshot = this.route.snapshot;
    if (routeSnapshot.data.submission === true) {
      this.submissionMode = true;
      this.redirectUrl = routeSnapshot.queryParams.teamId ? `/teams/view/${routeSnapshot.queryParams.teamId}` : '/manager/surveys';
      return;
    }
    this.urlName = this.route.snapshot.paramMap.get('name') || '';
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName)
      .subscribe((data: UserDocument) => {
        this.user = data;
        if (this.user.gender || this.user.name !== this.userService.get().name) {
          this.redirectUrl = '../../profile/' + this.user.name;
        }
        this.editForm.patchValue(this.mapUserToFormValue(data));
        this.initialFormValues = { ...this.editForm.getRawValue() };
        if (data._attachments) {
          // If multiple attachments this could break? Entering the if-block as well
          this.currentImgKey = Object.keys(data._attachments)[0];
          this.currentProfileImg = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + this.currentImgKey;
          this.uploadImage = true;
          this.originalAttachments = { ...data._attachments };
        }
        this.previewSrc = this.currentProfileImg;
        console.log('data: ', data);
        this.isFormInitialized = true;
        this.setupFormValueChanges();
      }, (error) => {
        console.log(error);
      });
  }

  userData() {
    this.editForm = this.fb.group<UsersUpdateFormGroup>({
      firstName: this.fb.control('', this.conditionalValidator(CustomValidators.required)),
      middleName: this.fb.control(''),
      lastName: this.fb.control('', this.conditionalValidator(CustomValidators.required)),
      email: this.fb.control('', [ this.conditionalValidator(Validators.required), Validators.email ]),
      language: this.fb.control('', this.conditionalValidator(Validators.required)),
      phoneNumber: this.fb.control('', this.conditionalValidator(CustomValidators.required)),
      birthDate: new FormControl<string | Date | null>(
        null,
        {
          validators: this.conditionalValidator(CustomValidators.dateValidRequired),
          asyncValidators: (ac: AbstractControl) => this.validatorService.notDateInFuture$(ac)
        }
      ),
      birthYear: new FormControl<number | null>(
        null,
        [
          Validators.min(1900),
          Validators.max(new Date().getFullYear() - 1),
          Validators.pattern(/^\d{4}$/)
        ]
      ),
      age: new FormControl<number | null>(null),
      gender: this.fb.control('', this.conditionalValidator(Validators.required)),
      level: this.fb.control('', this.conditionalValidator(Validators.required)),
      betaEnabled: this.fb.control(false)
    });
    this.initialFormValues = { ...this.editForm.getRawValue() };
  }

  setupFormValueChanges() {
    this.editForm.valueChanges.subscribe(() => {
      if (this.isFormInitialized) {
        this.hasUnsavedChanges = this.getHasUnsavedChanges();
      }
    });
  }

  conditionalValidator(validator: ValidatorFn): ValidatorFn {
    return (ac) => this.submissionMode ? null : validator(ac);
  }

  onSubmit() {
    // exports don't break: calculate age from birthYear form validation
    const birthYear = this.editForm.controls.birthYear.value;
    if (birthYear && birthYear.toString().length === 4) {
      const calculatedAge = new Date().getFullYear() - Number(birthYear);
      this.editForm.patchValue({ age: calculatedAge }, { emitEvent: false });
    }

    if (!this.editForm.valid) {
      showFormErrors(this.editForm.controls);
      return;
    }
    this.hasUnsavedChanges = this.getHasUnsavedChanges();
    this.submitUser();
  }

  submitUser() {
    if (this.submissionMode) {
      // Remove birthYear from submitted data
      const { birthYear, ...cleanUserData } = this.editForm.getRawValue();
      this.appendToSurvey(cleanUserData);
    } else {
      const attachment = this.file ? this.createAttachmentObj(this.file) : {};
      const updatedUser: UserDocument = { ...this.user, ...this.editForm.getRawValue(), ...attachment };
      this.userService.updateUser(updatedUser).pipe(
        switchMap(() => this.userService.addImageForReplication(true))
      ).subscribe(() => {
        this.avatarChanged = false;
        this.editForm.markAsPristine();
        this.initialFormValues = { ...this.editForm.getRawValue() };
        this.hasUnsavedChanges = false;
        this.goBack();
      }, (err) => {
        // Connect to an error display component to show user that an error has occurred
        console.log(err);
      });
    }
  }

  createAttachmentObj(file: string): { _attachments: Record<string, UserAttachment> } {
    // Unclear if only encoding is base64
    // This ought to cover any encoding as long as the formatting is: ";[encoding],"
    const imgDataArr: string[] = file.split(/;\w+,/);
    // Replacing start ['data:'] of content type string
    const contentType: string = imgDataArr[0].replace(/data:/, '');
    const data: string = imgDataArr[1];
    // Create attachment object
    const attachments: Record<string, UserAttachment> = {};
    // Alter between two possible keys for image element to ensure database updates
    const imgKey: string = this.currentImgKey === 'img' ? 'img_' : 'img';
    attachments[imgKey] = {
      'content_type': contentType,
      'data': data
    };

    return { '_attachments': attachments };
  }

  goBack() {
    this.router.navigate([ this.redirectUrl ], { relativeTo: this.route });
  }

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
  }

  onImageSelect(event: ImageCroppedEvent) {
    this.previewSrc = event.base64;
    this.file = event.base64;
    this.uploadImage = true;
    this.avatarChanged = true;
    this.hasUnsavedChanges = true;
  }

  removeImageFile() {
    this.previewSrc = this.currentProfileImg;
    this.file = null;
    this.uploadImage = false;
    this.avatarChanged = true;
    this.hasUnsavedChanges = true;
    this.imageChangedEvent = null;
  }

  deleteImageAttachment() {
    if (!this.currentImgKey) {
      return;
    }

    if (this.user._attachments && this.user._attachments[this.currentImgKey]) {
      delete this.user._attachments[this.currentImgKey];
    }

    this.currentProfileImg = 'assets/image.png';
    this.removeImageFile();
    this.avatarChanged = true;
    this.attachmentDeleted = true;
    this.hasUnsavedChanges = true;
  }

  resetSelection() {
    if (this.attachmentDeleted && this.originalAttachments) {
      this.user._attachments = { ...this.originalAttachments };
      this.currentImgKey = Object.keys(this.originalAttachments)[0];
      this.currentProfileImg = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + this.currentImgKey;
      this.uploadImage = true;
      this.attachmentDeleted = false;
      this.previewSrc = this.currentProfileImg;
      this.file = null;
      this.imageChangedEvent = null;
    } else {
      this.previewSrc = this.currentProfileImg;
      this.file = null;
      this.uploadImage = this.currentProfileImg !== 'assets/image.png';
      this.imageChangedEvent = null;
    }
    this.avatarChanged = false;
    this.hasUnsavedChanges = this.isFormPristine() ? false : true;
  }

  appendToSurvey(user: SubmissionUserPayload) {
    const submissionId = this.route.snapshot.params.id;
    this.couchService.get('submissions/' + submissionId).pipe(switchMap((submission) => {
      return this.couchService.put('submissions/' + submissionId, { ...submission, user });
    })).subscribe(() => {
      this.avatarChanged = false;
      this.initialFormValues = { ...this.editForm.getRawValue() };
      this.hasUnsavedChanges = false;
      this.goBack();
    });
  }

  canDeactivate(): boolean {
    return !this.getHasUnsavedChanges();
  }

  isFormPristine(): boolean {
    if (!this.initialFormValues) {
      return true;
    }
    return JSON.stringify(this.editForm.getRawValue()) === JSON.stringify(this.initialFormValues);
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.getHasUnsavedChanges()) {
      $event.returnValue = warningMsg;
    }
  }

  private getHasUnsavedChanges(): boolean {
    return !this.isFormPristine() || this.avatarChanged;
  }

  get additionalFieldsButtonText(): string {
    return this.showAdditionalFields ? $localize`Hide Additional Fields` : $localize`Show Additional Fields`;
  }

  openImageEditDialog(event: Event): void {
    this.showImagePreview = false;
    this.imageChangedEvent = event;
    const dialogRef = this.dialog.open(this.imageEditDialog, {
      width: '1000px'
    });
    dialogRef.afterClosed().subscribe(() => {
      this.showImagePreview = true;
    });
  }

  private mapUserToFormValue(user: UserDocument): Partial<UsersUpdateFormValue> {
    return {
      firstName: user.firstName ?? '',
      middleName: user.middleName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      language: user.language ?? '',
      phoneNumber: user.phoneNumber ?? '',
      birthDate: user.birthDate ?? null,
      birthYear: user.birthYear ?? null,
      age: user.age ?? null,
      gender: user.gender ?? '',
      level: user.level ?? '',
      betaEnabled: user.betaEnabled ?? false
    };
  }

}
