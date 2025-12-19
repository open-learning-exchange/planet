import { Component, OnInit, ViewEncapsulation, OnDestroy, HostListener } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, UntypedFormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subject, interval, of, race } from 'rxjs';
import { catchError, takeUntil, debounce } from 'rxjs/operators';
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
  editForm: UntypedFormGroup;
  profileForm: UntypedFormGroup;
  private onDestroy$ = new Subject<void>();
  initialFormValues: any;
  hasUnsavedChanges = false;
  get achievements(): UntypedFormArray {
    return <UntypedFormArray>this.editForm.controls.achievements;
  }
  get references(): UntypedFormArray {
    return <UntypedFormArray>this.editForm.controls.references;
  }
  get links(): UntypedFormArray {
    return <UntypedFormArray>this.editForm.controls.links;
  }
  minBirthDate: Date = this.userService.minBirthDate;

  constructor(
    private fb: UntypedFormBuilder,
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
        this.applyAchievementsToForm(achievements || {});
      }, (error) => {
        console.log(error);
        this.achievementNotFound = true;
      });

    this.planetStepListService.stepMoveClick$.pipe(takeUntil(this.onDestroy$)).subscribe(
      () => this.editForm.controls.dateSortOrder.setValue('none')
    );
  }

  private captureInitialState() {
    this.initialFormValues = this.getCurrentFormState();
    this.hasUnsavedChanges = false;
  }

  onFormChanges() {
    this.editForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true))),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => {
        this.evaluateUnsavedChanges();
      });

    this.profileForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true))),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => {
        this.evaluateUnsavedChanges();
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  createForm() {
    this.editForm = this.fb.group({
      purpose: '',
      goals: '',
      achievementsHeader: '',
      achievements: this.fb.array([]),
      references: this.fb.array([]),
      links: this.fb.array([]),
      // Keeping older otherInfo property so we don't lose this info on database
      otherInfo: this.fb.array([]),
      sendToNation: false,
      dateSortOrder: 'none'
    });
  }

  createProfileForm() {
    this.profileForm = this.fb.group({
      firstName: [ '', CustomValidators.required ],
      middleName: '',
      lastName: [ '', CustomValidators.required ],
      birthDate: [
        '',
        [ CustomValidators.dateValidRequired ],
        ac => this.validatorService.notDateInFuture$(ac)
      ],
      birthplace: ''
    });
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
      this.fb.group({
        ...achievement,
        title: [ achievement.title, CustomValidators.required ],
        description: [ achievement.description ],
        link: [ achievement.link, [], CustomValidators.validLink ],
        date: [ achievement.date, null, ac => this.validatorService.notDateInFuture$(ac) ]
      }),
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
      this.fb.group({
        relationship: '',
        phone: '',
        ...reference,
        name: [ reference.name, CustomValidators.required ],
        email: [ reference.email, Validators.email ],
      }),
      { onSubmit: this.onDialogSubmit(this.references, index), closeOnSubmit: true }
    );
  }

  addLink(index = -1, link: any = { title: '', url: '' }) {
    this.dialogsFormService.openDialogsForm(
      link.title !== '' ? $localize`Edit Link` : $localize`Add Link`,
      [
        { 'type': 'textbox', 'name': 'title', 'placeholder': $localize`Link Title`, required: true },
        { 'type': 'textbox', 'name': 'url', 'placeholder': $localize`URL`, required: true }
      ],
      this.fb.group({
        ...link,
        title: [ link.title, CustomValidators.required ],
        url: [ link.url, CustomValidators.required, CustomValidators.validLink ],
      }),
      { onSubmit: this.onDialogSubmit(this.links, index), closeOnSubmit: true }
    );
  }

  onDialogSubmit(formArray, index) {
    return (formValue, formGroup) => {
      if (formValue === undefined) {
        return;
      }
      this.updateFormArray(formArray, formGroup, index);
    };
  }

  updateFormArray(formArray: UntypedFormArray, value, index = -1) {
    this.normalizeDialogControls(value);
    if (index === -1) {
      formArray.push(value);
    } else {
      formArray.setControl(index, value);
    }
    if (value?.contains && value.contains('date')) {
      formArray.setValue(this.sortDate(formArray.value, this.editForm.controls.dateSortOrder.value || 'none'));
    }
    this.editForm.updateValueAndValidity();
  }

  sortAchievements() {
    const sort = this.editForm.controls.dateSortOrder.value === 'asc' ? 'desc' : 'asc';
    this.editForm.controls.dateSortOrder.setValue(sort);
    this.achievements.setValue(this.sortDate(this.achievements.value, sort));
  }

  sortDate(achievements, sortOrder = 'none') {
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
    this.editForm.updateValueAndValidity();
    this.profileForm.updateValueAndValidity();
    if (this.editForm.valid && this.profileForm.valid) {
      this.updateAchievements(this.docInfo, {
        ...this.editForm.value,
        achievements: this.achievements.value,
        references: this.references.value,
        links: this.links.value,
        otherInfo: this.editForm.controls.otherInfo.value
      }, { ...this.user, ...this.profileForm.value });
    } else {
      this.markAsInvalid(this.editForm);
      this.markAsInvalid(this.profileForm);
    }
  }

  markAsInvalid(userForm) {
    if (!userForm.valid) {
      showFormErrors(userForm.controls);
    }
  }

  updateAchievements(docInfo, achievements, userInfo) {
    // ...is the rest syntax for object destructuring
    forkJoin([
      this.couchService.post(this.dbName, { ...docInfo, ...achievements,
        'createdOn': this.configuration.code, 'username': this.user.name, 'parentCode': this.configuration.parentCode }),
      this.userService.updateUser(userInfo)
    ]).subscribe(() => {
      this.planetMessageService.showMessage($localize`Achievements successfully updated`);
      this.captureInitialState();
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

  onLeaveConfirmed() {
    this.captureInitialState();
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = warningMsg;
    }
  }

  private applyAchievementsToForm(achievements) {
    const normalizedAchievements = this.normalizeAchievements(achievements);

    this.editForm.patchValue(normalizedAchievements);
    this.replaceFormArray('achievements', normalizedAchievements.achievements);
    this.replaceFormArray('references', normalizedAchievements.references);
    this.replaceFormArray('links', normalizedAchievements.links);
    // Keeping older otherInfo property so we don't lose this info on database
    this.replaceFormArray('otherInfo', normalizedAchievements.otherInfo);

    this.updateDocInfoRevision(normalizedAchievements);
    this.captureInitialState();
    this.onFormChanges();
  }

  private replaceFormArray(controlName: string, value: any[]) {
    this.editForm.setControl(controlName, this.fb.array(value || []));
  }

  private normalizeAchievements(achievements) {
    return {
      ...achievements,
      achievements: achievements?.achievements || [],
      references: achievements?.references || [],
      links: achievements?.links || [],
      otherInfo: achievements?.otherInfo || [],
    };
  }

  private updateDocInfoRevision(achievements) {
    if (achievements && achievements._rev && (achievements._id === this.docInfo._id || achievements._id === this.user._id)) {
      this.docInfo = { ...this.docInfo, _id: achievements._id, _rev: achievements._rev };
    }
  }

  private getCurrentFormState() {
    return JSON.stringify({
      editForm: {
        ...this.editForm.value,
        achievements: this.achievements.value,
        references: this.references.value,
        links: this.links.value,
        otherInfo: this.editForm.controls.otherInfo.value
      },
      profileForm: this.profileForm.value
    });
  }

  private evaluateUnsavedChanges() {
    this.hasUnsavedChanges = this.getCurrentFormState() !== this.initialFormValues;
  }

  private normalizeDialogControls(formGroup: UntypedFormGroup) {
    if (!formGroup?.get) {
      return;
    }
    this.normalizeDateControl(formGroup, 'date');
    this.normalizeLinkControl(formGroup, 'link');
    this.normalizeLinkControl(formGroup, 'url');
  }

  private normalizeDateControl(formGroup: UntypedFormGroup, controlName: string) {
    const control = formGroup.get(controlName);
    if (control && control.value instanceof Date) {
      control.setValue(control.value.toISOString());
    }
  }

  private normalizeLinkControl(formGroup: UntypedFormGroup, controlName: string) {
    const control = formGroup.get(controlName);
    if (control && typeof control.value === 'string') {
      control.setValue(control.value.trim());
    }
  }
}
