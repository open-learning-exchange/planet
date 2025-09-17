import { Component, HostListener, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { MatDialog } from '@angular/material/dialog';
import { TemplateRef, ViewChild } from '@angular/core';

@Component({
  templateUrl: './users-update.component.html',
  styleUrls: [ './users-update.scss' ]
})
export class UsersUpdateComponent implements OnInit, CanComponentDeactivate {
  user: any = {};
  initialFormValues: any;
  educationLevel = educationLevel;
  readonly dbName = '_users'; // make database name a constant
  editForm: UntypedFormGroup;
  currentImgKey: string;
  currentProfileImg = 'assets/image.png';
  previewSrc = 'assets/image.png';
  uploadImage = false;
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  urlName = '';
  redirectUrl = '/';
  file: any;
  roles: string[] = [];
  languages = languages;
  submissionMode = false;
  showAdditionalFields = false;
  planetConfiguration = this.stateService.configuration;
  minBirthDate: Date = this.userService.minBirthDate;
  hasUnsavedChanges = false;
  avatarChanged = false;
  attachmentDeleted = false;
  originalAttachments: any = null;
  isFormInitialized = false;
  imageChangedEvent: Event | null = null;
  showImagePreview = true;
  @ViewChild('imageEditDialog') imageEditDialog: TemplateRef<any>;

  constructor(
    private fb: UntypedFormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private stateService: StateService,
    private validatorService: ValidatorService,
    private dialog: MatDialog
  ) {
    this.userData();
  }

  ngOnInit() {
    const routeSnapshot = this.route.snapshot;
    if (routeSnapshot.data.submission === true) {
      this.submissionMode = true;
      this.redirectUrl = routeSnapshot.queryParams.teamId ? `/teams/view/${routeSnapshot.queryParams.teamId}` : '/manager/surveys';
      return;
    }
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName)
      .subscribe((data) => {
        this.user = data;
        if (this.user.gender || this.user.name !== this.userService.get().name) {
          this.redirectUrl = '../../profile/' + this.user.name;
        }
        this.editForm.patchValue(data);
        this.initialFormValues = { ...this.editForm.value };
        if (data['_attachments']) {
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
    this.editForm = this.fb.group({
      firstName: [ '', this.conditionalValidator(CustomValidators.required).bind(this) ],
      middleName: '',
      lastName: [ '', this.conditionalValidator(CustomValidators.required).bind(this) ],
      email: [ '', [ this.conditionalValidator(Validators.required).bind(this), Validators.email ] ],
      language: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      phoneNumber: [ '', this.conditionalValidator(CustomValidators.required).bind(this) ],
      birthDate: [
        '',
        this.conditionalValidator(CustomValidators.dateValidRequired).bind(this),
        ac => this.validatorService.notDateInFuture$(ac)
      ],
      birthYear: [ '', [
        Validators.min(1900),
        Validators.max(new Date().getFullYear()),
        Validators.pattern(/^\d{4}$/)
      ]],
      age: [ '' ],
      gender: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      level: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      betaEnabled: false
    });
  }

  setupFormValueChanges() {
    this.editForm.valueChanges.subscribe(() => {
      if (this.isFormInitialized) {
        this.hasUnsavedChanges = this.getHasUnsavedChanges();
      }
    });
  }

  conditionalValidator(validator: any) {
    return (ac) => this.submissionMode ? null : validator(ac);
  }

  onSubmit() {
    // backwards compatibility: calculate age from for validation and remove birthYear field
    const birthYear = this.editForm.get('birthYear')?.value;
    if (birthYear && birthYear.toString().length === 4) {
      const calculatedAge = new Date().getFullYear() - parseInt(birthYear, 10);
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
      const { birthYear, ...cleanUserData } = this.editForm.value;
      this.appendToSurvey(cleanUserData);
    } else {
      const attachment = this.file ? this.createAttachmentObj() : {};
      this.userService.updateUser(Object.assign({}, this.user, this.editForm.value, attachment)).pipe(
        switchMap(() => this.userService.addImageForReplication(true))
      ).subscribe(() => {
        this.avatarChanged = false;
        this.editForm.markAsPristine();
        this.initialFormValues = { ...this.editForm.value };
        this.hasUnsavedChanges = false;
        this.goBack();
      }, (err) => {
        // Connect to an error display component to show user that an error has occurred
        console.log(err);
      });
    }
  }

  createAttachmentObj(): object {
    // Unclear if only encoding is base64
    // This ought to cover any encoding as long as the formatting is: ";[encoding],"
    const imgDataArr: string[] = this.file.split(/;\w+,/);
    // Replacing start ['data:'] of content type string
    const contentType: string = imgDataArr[0].replace(/data:/, '');
    const data: string = imgDataArr[1];
    // Create attachment object
    const attachments: object = {};
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

  appendToSurvey(user) {
    const submissionId = this.route.snapshot.params.id;
    this.couchService.get('submissions/' + submissionId).pipe(switchMap((submission) => {
      return this.couchService.put('submissions/' + submissionId, { ...submission, user });
    })).subscribe(() => {
      this.avatarChanged = false;
      this.initialFormValues = { ...this.editForm.value };
      this.hasUnsavedChanges = false;
      this.goBack();
    });
  }

  canDeactivate(): boolean {
    return !this.getHasUnsavedChanges();
  }

  isFormPristine(): boolean {
    return JSON.stringify(this.editForm.value) === JSON.stringify(this.initialFormValues);
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

}
