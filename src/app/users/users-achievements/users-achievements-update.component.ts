import { Component, OnInit, ViewEncapsulation, OnDestroy, HostListener } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, forkJoin, Subject, interval, of, race } from 'rxjs';
import { catchError, takeUntil, debounce, filter, startWith, take } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { PlanetStepListService } from '../../shared/forms/planet-step-list.component';
import { showFormErrors } from '../../shared/table-helpers';
import { CanComponentDeactivate } from '../../shared/unsaved-changes.guard';
import { warningMsg } from '../../shared/unsaved-changes.component';

type DateValue = string | Date;
type DateSortOrder = 'none' | 'asc' | 'desc';

interface AchievementFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  link: FormControl<string>;
  date: FormControl<DateValue>;
}

interface ReferenceFormControls {
  name: FormControl<string>;
  relationship: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
}

interface LinkFormControls {
  title: FormControl<string>;
  url: FormControl<string>;
}

interface EditFormControls {
  purpose: FormControl<string>;
  goals: FormControl<string>;
  achievementsHeader: FormControl<string>;
  achievements: FormArray<AchievementFormGroup>;
  references: FormArray<ReferenceFormGroup>;
  links: FormArray<LinkFormGroup>;
  otherInfo: FormArray<FormControl<any>>;
  sendToNation: FormControl<boolean>;
  dateSortOrder: FormControl<DateSortOrder>;
}

interface ProfileFormControls {
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  birthDate: FormControl<DateValue>;
  birthplace: FormControl<string>;
}

type AchievementFormGroup = FormGroup<AchievementFormControls>;
type ReferenceFormGroup = FormGroup<ReferenceFormControls>;
type LinkFormGroup = FormGroup<LinkFormControls>;

@Component({
  templateUrl: './users-achievements-update.component.html',
  styleUrls: [ 'users-achievements-update.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UsersAchievementsUpdateComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  user = this.userService.get();
  configuration = this.stateService.configuration;
  docInfo = { '_id': this.user._id + '@' + this.configuration.code, '_rev': undefined };
  readonly dbName = 'achievements';
  achievementNotFound = false;
  editForm!: FormGroup<EditFormControls>;
  profileForm!: FormGroup<ProfileFormControls>;
  private onDestroy$ = new Subject<void>();
  initialFormValues: any;
  hasUnsavedChanges = false;
  submitAttempted = false;
  private submitAfterPending = false;
  get achievements(): FormArray<AchievementFormGroup> {
    return this.editForm.controls.achievements;
  }
  get references(): FormArray<ReferenceFormGroup> {
    return this.editForm.controls.references;
  }
  get links(): FormArray<LinkFormGroup> {
    return this.editForm.controls.links;
  }
  minBirthDate: Date = this.userService.minBirthDate;

  constructor(
    private fb: NonNullableFormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private dialogsFormService: DialogsFormService,
    private stateService: StateService,
    private validatorService: ValidatorService,
    private planetStepListService: PlanetStepListService
  ) {
    this.createForm();
    this.createProfileForm();
  }

  ngOnInit() {
    this.profileForm.patchValue(this.user);
    this.usersAchievementsService.getAchievements(this.docInfo._id)
      .pipe(
        catchError(() => this.usersAchievementsService.getAchievements(this.user._id))
      )
      .subscribe((achievements) => {
        this.editForm.patchValue({
          purpose: achievements.purpose,
          goals: achievements.goals,
          achievementsHeader: achievements.achievementsHeader,
          sendToNation: achievements.sendToNation,
          dateSortOrder: achievements.dateSortOrder || 'none'
        });
        this.editForm.setControl('achievements', this.buildAchievementsFormArray(achievements.achievements));
        this.editForm.setControl('references', this.buildReferencesFormArray(achievements.references));
        this.editForm.setControl('links', this.buildLinksFormArray(achievements.links));
        // Keeping older otherInfo property so we don't lose this info on database
        this.editForm.setControl('otherInfo', this.buildOtherInfoFormArray(achievements.otherInfo));

        if (this.docInfo._id === achievements._id) {
          this.docInfo._rev = achievements._rev;
        }
        this.captureInitialState();
        this.onFormChanges();
      }, (error) => {
        console.log(error);
        this.achievementNotFound = true;
        this.captureInitialState();
        this.onFormChanges();
      });

    this.planetStepListService.stepMoveClick$.pipe(takeUntil(this.onDestroy$)).subscribe(
      () => this.editForm.controls.dateSortOrder.setValue('none')
    );
  }

  private captureInitialState() {
    const editFormState = this.editForm.getRawValue();
    this.initialFormValues = JSON.stringify({
      editForm: editFormState,
      profileForm: this.profileForm.getRawValue()
    });
  }

  onFormChanges() {
    this.editForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true))),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => this.updateUnsavedChangesFlag());

    this.profileForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true))),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => this.updateUnsavedChangesFlag());
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  createForm() {
    this.editForm = this.fb.group<EditFormControls>({
      purpose: this.fb.control(''),
      goals: this.fb.control(''),
      achievementsHeader: this.fb.control(''),
      achievements: this.fb.array<AchievementFormGroup>([]),
      references: this.fb.array<ReferenceFormGroup>([]),
      links: this.fb.array<LinkFormGroup>([]),
      // Keeping older otherInfo property so we don't lose this info on database
      otherInfo: this.fb.array<FormControl<any>>([]),
      sendToNation: this.fb.control(false),
      dateSortOrder: this.fb.control<DateSortOrder>('none')
    });
  }

  createProfileForm() {
    this.profileForm = this.fb.group<ProfileFormControls>({
      firstName: this.fb.control('', { validators: CustomValidators.required }),
      middleName: this.fb.control(''),
      lastName: this.fb.control('', { validators: CustomValidators.required }),
      birthDate: this.fb.control('', {
        validators: [ CustomValidators.dateValidRequired ],
        asyncValidators: ac => this.validatorService.notDateInFuture$(ac)
      }),
      birthplace: this.fb.control('')
    });
  }

  private buildAchievementsFormArray(achievements: any[] = []) {
    return this.fb.array(achievements.map((achievement) => this.createAchievementGroup(achievement)));
  }

  private buildReferencesFormArray(references: any[] = []) {
    return this.fb.array(references.map((reference) => this.createReferenceGroup(reference)));
  }

  private buildLinksFormArray(links: any[] = []) {
    return this.fb.array(links.map((link) => this.createLinkGroup(link)));
  }

  private buildOtherInfoFormArray(otherInfo: any[] = []): FormArray<FormControl<any>> {
    return this.fb.array(otherInfo.map((otherInfoItem) => this.fb.control(otherInfoItem)));
  }

  private createAchievementGroup(achievement: any = { title: '', description: '', link: '', date: '' }): AchievementFormGroup {
    if (typeof achievement === 'string') {
      achievement = { title: '', description: achievement, link: '', date: '' };
    }
    return this.fb.group<AchievementFormControls>({
      title: this.fb.control(achievement.title || '', { validators: CustomValidators.required }),
      description: this.fb.control(achievement.description || ''),
      link: this.fb.control(achievement.link || '', { asyncValidators: CustomValidators.validLink }),
      date: this.fb.control(achievement.date || '', { asyncValidators: ac => this.validatorService.notDateInFuture$(ac) })
    });
  }

  private createReferenceGroup(reference: any = { name: '' }): ReferenceFormGroup {
    return this.fb.group<ReferenceFormControls>({
      name: this.fb.control(reference.name || '', { validators: CustomValidators.required }),
      relationship: this.fb.control(reference.relationship || ''),
      phone: this.fb.control(reference.phone || ''),
      email: this.fb.control(reference.email || '', { validators: Validators.email })
    });
  }

  private createLinkGroup(link: any = { title: '', url: '' }): LinkFormGroup {
    return this.fb.group<LinkFormControls>({
      title: this.fb.control(link.title || '', { validators: CustomValidators.required }),
      url: this.fb.control(link.url || '', {
        validators: CustomValidators.required,
        asyncValidators: CustomValidators.validLink
      })
    });
  }

  private updateUnsavedChangesFlag() {
    const editFormState = this.editForm.getRawValue();
    const currentState = JSON.stringify({
      editForm: editFormState,
      profileForm: this.profileForm.getRawValue()
    });
    this.hasUnsavedChanges = currentState !== this.initialFormValues;
  }

  addAchievement(index = -1, achievement = { title: '', description: '', link: '', date: '' }) {
    if (typeof achievement === 'string') {
      achievement = { title: '', description: achievement, link: '', date: '' };
    }
    this.dialogsFormService.openDialogsForm(
      achievement.title !== '' ? $localize`Edit Achievement` : $localize`Add Achievement`,
      [
        { 'type': 'textbox', 'name': 'title', 'placeholder': $localize`Title`, required: true },
        { 'type': 'date', 'name': 'date', 'placeholder': $localize`Date`, 'required': false },
        { 'type': 'textbox', 'name': 'link', 'placeholder': $localize`Link`, required: false },
        { 'type': 'textarea', 'name': 'description', 'placeholder': $localize`Description`, 'required': false },
      ],
      this.createAchievementGroup(achievement),
      { onSubmit: (formValue, formGroup) => {
        const achievedAt = formGroup.controls.date.value instanceof Date ? formGroup.controls.date.value.toISOString() :
         formGroup.controls.date.value;
        formGroup.controls.date.setValue(achievedAt);
        this.onDialogSubmit(this.achievements, index)(formValue, formGroup);
      }, closeOnSubmit: true }
    );
  }

  addReference(index = -1, reference: any = { name: '' }) {
    this.dialogsFormService.openDialogsForm(
      reference.name !== '' ? $localize`Edit Reference` : $localize`Add Reference`,
      [
        { 'type': 'textbox', 'name': 'name', 'placeholder': $localize`Name`, required: true },
        { 'type': 'textbox', 'name': 'relationship', 'placeholder': $localize`Relationship`, 'required': false },
        { 'type': 'textbox', 'name': 'phone', 'placeholder': $localize`Phone Number`, 'required': false },
        { 'type': 'textbox', 'name': 'email', 'placeholder': $localize`Email`, 'required': false }
      ],
      this.createReferenceGroup(reference),
      { onSubmit: this.onDialogSubmit(this.references, index), closeOnSubmit: true }
    );
  }

  addLink(index = -1, link: any = { title: '', url: '' }) {
    this.dialogsFormService.openDialogsForm(
      link.title !== '' ? $localize`Edit Link` : $localize`Add Link`,
      [
        { 'type': 'textbox', 'name': 'title', 'placeholder': $localize`Link Title`, required: true },
        { 'type': 'textbox', 'name': 'url', 'placeholder': $localize`URL`, 'required': true }
      ],
      this.createLinkGroup(link),
      { onSubmit: this.onDialogSubmit(this.links, index), closeOnSubmit: true }
    );
  }

  onDialogSubmit<T extends FormGroup>(formArray: FormArray<T>, index: number) {
    return (formValue: unknown, formGroup: T) => {
      if (formValue === undefined) {
        return;
      }
      this.updateFormArray(formArray, formGroup, index);
    };
  }

  updateFormArray<T extends FormGroup>(formArray: FormArray<T>, value: T, index = -1) {
    if (index === -1) {
      formArray.push(value);
    } else {
      formArray.setControl(index, value);
    }
    if (value?.get?.('date')) {
      formArray.setValue(this.sortDate(formArray.value as any[], this.editForm.controls.dateSortOrder.value || 'none') as any);
    }
  }

  sortAchievements() {
    const sort = this.editForm.controls.dateSortOrder.value === 'asc' ? 'desc' : 'asc';
    this.editForm.controls.dateSortOrder.setValue(sort);
    this.achievements.setValue(this.sortDate(this.achievements.value, sort));
  }

  sortDate(achievements: any[], sortOrder: DateSortOrder = 'none') {
    if (sortOrder === 'none') {
      return achievements;
    }
    return achievements.sort((a, b) => {
      if (!a.date) {
        return 1;
      }
      const order = sortOrder === 'desc' ? 1 : -1;
      return (a.date < b.date || !b.date) ? order * 1 : order * -1;
    });
  }

  onSubmit() {
    this.submitAttempted = true;
    if (this.editForm.pending || this.profileForm.pending) {
      this.submitAfterPending = true;
      this.submitWhenReady();
      return;
    }
    this.submitAfterPending = false;
    if (this.editForm.valid && this.profileForm.valid) {
      this.submitAttempted = false;
      this.updateAchievements(this.docInfo, this.editForm.value, { ...this.user, ...this.profileForm.value });
      this.hasUnsavedChanges = false;
    } else {
      this.markAsInvalid(this.editForm);
      this.markAsInvalid(this.profileForm);
    }
  }

  private submitWhenReady() {
    combineLatest([
      this.editForm.statusChanges.pipe(startWith(this.editForm.status)),
      this.profileForm.statusChanges.pipe(startWith(this.profileForm.status))
    ]).pipe(
      filter(([ editStatus, profileStatus ]) => editStatus !== 'PENDING' && profileStatus !== 'PENDING'),
      take(1)
    ).subscribe(() => {
      if (this.submitAfterPending) {
        this.onSubmit();
      }
    });
  }

  markAsInvalid(userForm: FormGroup<any>) {
    if (!userForm.valid) {
      userForm.markAllAsTouched();
      showFormErrors(userForm.controls);
    }
  }

  sectionError(section: 'achievements' | 'references' | 'links'): string {
    const index = this.firstInvalidIndex(this.editForm.controls[section]);
    if (index < 0 || !this.submitAttempted) {
      return '';
    }
    const itemNumber = index + 1;
    switch (section) {
      case 'achievements':
        return $localize`Achievement #${itemNumber} has invalid fields`;
      case 'references':
        return $localize`Reference #${itemNumber} has invalid fields`;
      case 'links':
        return $localize`Link #${itemNumber} has invalid fields`;
    }
  }

  private firstInvalidIndex(formArray: FormArray<FormGroup<any>>): number {
    return formArray.controls.findIndex((control) => control.invalid);
  }

  updateAchievements(docInfo, achievements, userInfo) {
    // ...is the rest syntax for object destructuring
    forkJoin([
      this.couchService.post(this.dbName, { ...docInfo, ...achievements,
        'createdOn': this.configuration.code, 'username': this.user.name, 'parentCode': this.configuration.parentCode }),
      this.userService.updateUser(userInfo)
    ]).subscribe(() => {
      this.planetMessageService.showMessage($localize`Achievements successfully updated`);
      this.goBack();
    }, (err) => {
      this.planetMessageService.showAlert($localize`There was an error updating your achievements`);
    });
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  canDeactivate(): boolean {
    return !this.hasUnsavedChanges;
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = warningMsg;
    }
  }

}
