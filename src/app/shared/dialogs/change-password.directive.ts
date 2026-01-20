import { Directive, HostListener, Input, OnChanges } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError, finalize } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { StateService } from '../state.service';
import { DialogsLoadingService } from './dialogs-loading.service';
import { ManagerService } from '../../manager-dashboard/manager.service';

const changePasswordFields = [
  {
    'label': $localize`Old Password`,
    'type': 'password',
    'name': 'oldPassword',
    'placeholder': $localize`Old Password`,
    'required': true
  }
];
const resetPasswordFields = [
  {
    'label': $localize`Password`,
    'type': 'password',
    'name': 'password',
    'placeholder': $localize`Password`,
    'required': true
  },
  {
    'label': $localize`Confirm Password`,
    'type': 'password',
    'name': 'confirmPassword',
    'placeholder': $localize`Confirm Password`,
    'required': true
  }
];

@Directive({
  selector: '[planetChangePassword]'
})
export class ChangePasswordDirective implements OnChanges {

  _userDetail: any = undefined;
  @Input('planetChangePassword') set userDetail(value: any) {
    this._userDetail = value._id === undefined ? undefined : value;
  }
  isLoggedInUser: boolean;
  dbName = '_users';
  resetPasswordFormGroup = {
    password: [
      '',
      Validators.compose([
        Validators.required,
        CustomValidators.spaceValidator,
        CustomValidators.matchPassword('confirmPassword', false)
      ])
    ],
    confirmPassword: [
      '',
      Validators.compose([
        Validators.required,
        CustomValidators.matchPassword('password', true)
      ])
    ]
  };
  changePasswordFormGroup = {
    ...this.resetPasswordFormGroup,
    oldPassword: [
      '',
      Validators.compose([
        Validators.required,
        CustomValidators.matchPassword('password', false, false)
      ]),
      ac => this.validatorService.checkPassword$(ac)
    ],
    password: [
      '',
      Validators.compose([
        Validators.required,
        CustomValidators.spaceValidator,
        CustomValidators.matchPassword('oldPassword', true, false),
        CustomValidators.matchPassword('confirmPassword', false)
      ])
    ]
  };
  planetConfiguration = this.stateService.configuration;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private managerService: ManagerService
  ) {}

  ngOnChanges() {
    this.isLoggedInUser = this._userDetail === undefined || this._userDetail._id === this.userService.get()._id;
  }

  @HostListener('click')
  openChangePasswordForm() {
    const formFields = this.isLoggedInUser ? [ ...changePasswordFields, ...resetPasswordFields ] : resetPasswordFields;
    const formGroups = this.isLoggedInUser ? this.changePasswordFormGroup : this.resetPasswordFormGroup;
    this.dialogsFormService.openDialogsForm(
      $localize`Change Password`,
      formFields,
      formGroups,
      { onSubmit: this.onPasswordSubmit.bind(this) }
    );
  }

  onPasswordSubmit(credentialData) {
    const user = this._userDetail || this.userService.get();
    const obs = this.isLoggedInUser
      ? this.couchService.post('_session', { 'name': user.name, 'password': credentialData.oldPassword })
      : of(true);
    obs.pipe(
      switchMap(() => this.changePassword(credentialData, user)),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((responses) => {
      const errors = responses.filter(r => r.ok === false);
      if (errors.length === 0) {
        this.planetMessageService.showMessage($localize`Password successfully updated`);
        this.dialogsFormService.closeDialogsForm();
      } else {
        this.planetMessageService.showAlert(errors.map(e => e.reason).join(' & '));
      }
    }, (err) => {
      if (err.error.reason === 'Name or password is incorrect.') {
        this.dialogsFormService.showErrorMessage($localize`Old password isn't valid`);
      }
      this.planetMessageService.showAlert($localize`Error changing password`);
    });
  }

  changePassword(credentialData, userDetail) {
    const updateDoc = Object.assign({ password: credentialData.password }, userDetail);
    return this.changePasswordRequest(updateDoc).pipe(switchMap((responses) => {
      const obs = [ ...responses.map(r => of(r)) ];
      if (this.isLoggedInUser) {
        obs.push(this.reinitSession(userDetail.name, credentialData.password));
      }
      return forkJoin(obs);
    }));
  }

  changePasswordRequest(userData) {
    if (this.isLoggedInUser && this.userService.get().roles.indexOf('_admin') > -1) {
      userData = { ...userData, adminName : userData.name + '@' + this.planetConfiguration.code + '@' + Date.now() };
    }
    return this.userService.updateUser(userData).pipe(switchMap((res) => {
      if (this.userService.get().roles.indexOf('_admin') > -1) {
        return forkJoin([
          of(res), this.updateAdminPassword(userData), this.updatePasswordOnParent(userData),
          this.managerService.updateCredentialsYml(userData)
        ]);
      }
      return of([ res ]);
    }));
  }

  passwordError(reason: string) {
    return () => {
      return of({ error: { ok: false, reason: reason } });
    };
  }

  reinitSession(username, password) {
    return forkJoin([
      this.couchService.post('_session', { 'name': username, 'password': password }, { withCredentials: true }),
      this.couchService.post('_session', { 'name': this.planetConfiguration.adminName, 'password': password },
        { withCredentials: true, domain: this.planetConfiguration.parentDomain })
    ]).pipe(
      // Silent error for now so other specific messages are shown
      catchError(() => of({})),
      // Reset user data with credential information
      switchMap(() => this.userService.resetUserData(`org.couchdb.user:${username}`))
    );
  }

  updatePasswordOnParent(userData) {
    const { adminName } = userData;
    const adminId = `org.couchdb.user:${adminName}`;
    if (this.isLoggedInUser) {
      return this.couchService.get('_users/' + adminId , { domain: this.planetConfiguration.parentDomain })
        .pipe(catchError(this.passwordError('Error changing password in parent planet')),
        switchMap((data) => {
          if (data.ok === false) {
            return of(data);
          }
          const { derived_key, iterations, password_scheme, salt, ...profile } = data;
          return this.couchService.put(this.dbName + '/' + profile._id, { ...profile, password: userData.password, type: 'user' },
            { domain: this.planetConfiguration.parentDomain });
        }));
    }
    const { code, _id: requestId, parentDomain: domain } = this.stateService.configuration;
    const parentUser = {
      ...userData,
      _id: adminId,
      requestId,
      isUserAdmin: false,
      roles: [ 'learner' ],
      name: adminName,
      sync: true,
      _attachments: undefined,
      _rev: undefined
    };
    return this.couchService.updateDocument(this.dbName, parentUser, { domain, withCredentials: false })
      .pipe(catchError(this.passwordError('Error changing password in parent planet')));
  }

  updateAdminPassword(userData) {
    return this.couchService.put('_node/nonode@nohost/_config/admins/' + userData.name, userData.password)
      .pipe(catchError(this.passwordError('Error changing admin password')),
      switchMap((response) => {
        return of(response);
      }));
  }

}
