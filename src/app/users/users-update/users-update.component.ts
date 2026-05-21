import { Component, HostListener, OnInit, TemplateRef, ViewChild } from '@angular/core';
import {
  FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { switchMap } from 'rxjs/operators';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { UserService } from '../../shared/user.service';
import { environment } from '../../../environments/environment';
import { ValidatorService } from '../../validators/validator.service';
import { showFormErrors } from '../../shared/table-helpers';
import { CanComponentDeactivate } from '../../shared/unsaved-changes.guard';
import { warningMsg } from '../../shared/unsaved-changes.component';
import { CouchService } from '../../shared/couchdb.service';
import { SubmissionUserPayload, UserAttachment, UserDocument, UsersUpdateFormValue } from './users-update.model';
import {
  UsersProfileFormGroup, createUsersProfileForm, normalizeUsersProfileSubmission
} from '../../shared/forms/users-profile-form.helpers';
import { MatToolbar } from '@angular/material/toolbar';
import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SubmitDirective } from '../../shared/submit.directive';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { UsersProfileFormComponent } from '../../shared/forms/users-profile-form.component';

@Component({
  templateUrl: './users-update.component.html',
  styleUrls: ['./users-update.scss'],
  imports: [
    MatToolbar, NgIf, MatIconButton, MatIcon, NgSwitch, NgSwitchCase, FormsModule, ReactiveFormsModule,
    MatButton, SubmitDirective, CdkScrollable, MatDialogContent, ImageCropperComponent,
    MatDialogActions, MatDialogClose, UsersProfileFormComponent
  ]
})
export class UsersUpdateComponent implements OnInit, CanComponentDeactivate {
  user: UserDocument = { name: '', roles: [] };
  initialFormValues: UsersUpdateFormValue | null = null;
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup<UsersProfileFormGroup>;
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
  submissionMode = false;
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
    private validatorService: ValidatorService,
    private dialog: MatDialog
  ) {
    this.submissionMode = this.route.snapshot.data.submission === true;
    this.editForm = createUsersProfileForm(this.fb, this.validatorService, this.submissionMode);
    const nav = this.router.getCurrentNavigation();
    this.title = nav?.extras?.state?.['title'] || '';
  }

  ngOnInit() {
    const routeSnapshot = this.route.snapshot;
    if (routeSnapshot.data.submission === true) {
      this.redirectUrl = routeSnapshot.queryParams.teamId ? `/teams/view/${routeSnapshot.queryParams.teamId}` : '/manager/surveys';
      this.initialFormValues = { ...this.editForm.getRawValue() };
      this.isFormInitialized = true;
      this.setupFormValueChanges();
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

  setupFormValueChanges() {
    this.editForm.valueChanges.subscribe(() => {
      if (this.isFormInitialized) {
        this.hasUnsavedChanges = this.getHasUnsavedChanges();
      }
    });
  }

  onSubmit() {
    if (!this.editForm.valid) {
      showFormErrors(this.editForm.controls);
      return;
    }
    this.hasUnsavedChanges = this.getHasUnsavedChanges();
    this.submitUser();
  }

  submitUser() {
    if (this.submissionMode) {
      this.appendToSurvey(normalizeUsersProfileSubmission(this.editForm.getRawValue()));
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
