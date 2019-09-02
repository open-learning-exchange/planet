import { Directive, HostListener, Input } from '@angular/core';
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
    'label': 'Old Password',
    'type': 'password',
    'name': 'oldPassword',
    'placeholder': 'Old Password',
    'required': true
  }
];
const resetPasswordFields = [
  {
    'label': 'Password',
    'type': 'password',
    'name': 'password',
    'placeholder': 'Password',
    'required': true
  },
  {
    'label': 'Confirm Password',
    'type': 'password',
    'name': 'confirmPassword',
    'placeholder': 'Confirm Password',
    'required': true
  }
];

@Directive({
  selector: '[planetChangePassword]'
})
export class ChangePasswordDirective {

  @Input('planetChangePassword') userDetail: any;
  loggedUser = this.userService.get();
  dbName = '_users';
  changePasswordFormGroup = {
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
        CustomValidators.matchPassword('oldPassword', true, false),
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
  resetPasswordFormGroup = {
    password: [
      '',
      Validators.compose([
        Validators.required,
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

  @HostListener('click')
  openChangePasswordForm() {
    const formFields = this.ownAccount() ? [ ...changePasswordFields, ...resetPasswordFields ] : resetPasswordFields;
    const formGroups = this.ownAccount() ? this.changePasswordFormGroup : this.resetPasswordFormGroup;
    this.dialogsFormService.openDialogsForm(
      'Change Password',
      formFields,
      formGroups,
      { onSubmit: this.onPasswordSubmit.bind(this) }
    );
  }

  onPasswordSubmit(credentialData) {
    const user = this.userDetail || this.loggedUser;
    const obs = this.ownAccount(user)
      ? this.couchService.post('_session', { 'name': user.name, 'password': credentialData.oldPassword })
      : of(true);
    obs.pipe(
      switchMap(() => this.changePassword(credentialData, user)),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((responses) => {
      const errors = responses.filter(r => r.ok === false);
      if (errors.length === 0) {
        this.planetMessageService.showMessage('Password successfully updated');
        this.dialogsFormService.closeDialogsForm();
      } else {
        this.planetMessageService.showAlert(errors.map(e => e.reason).join(' & '));
      }
    }, (err) => {
      if (err.error.reason === 'Name or password is incorrect.') {
        this.dialogsFormService.showErrorMessage('Old password isn\'t valid');
      }
      this.planetMessageService.showAlert('Error changing password');
    });
  }

  changePassword(credentialData, userDetail) {
    const updateDoc = Object.assign({ password: credentialData.password }, userDetail);
    return this.changePasswordRequest(updateDoc).pipe(switchMap((responses) => {
      const obs = [ ...responses.map(r => of(r)) ];
      if (this.ownAccount(userDetail)) {
        obs.push(this.reinitSession(userDetail.name, credentialData.password));
      }
      return forkJoin(obs);
    }));
  }

  changePasswordRequest(userData) {
    return this.userService.updateUser(userData).pipe(switchMap((res) => {
      if (this.ownAccount(userData) && this.userService.get().roles.indexOf('_admin') > -1) {
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
    ]).pipe(catchError(() => {
      // Silent error for now so other specific messages are shown
      return of({ ok: true });
    }));
  }

  updatePasswordOnParent(userData) {
    const adminName = 'org.couchdb.user:' + this.planetConfiguration.adminName;
    return this.couchService.get('_users/' + adminName , { domain: this.planetConfiguration.parentDomain })
      .pipe(catchError(this.passwordError('Error changing password in parent planet')),
      switchMap((data) => {
        if (data.ok === false) {
          return of(data);
        }
        const { derived_key, iterations, password_scheme, salt, ...profile } = data;
        profile.password = userData.password;
        return this.couchService.put(this.dbName + '/' + profile._id, profile,
          { domain: this.planetConfiguration.parentDomain });
      }));
  }

  updateAdminPassword(userData) {
    return this.couchService.put('_node/nonode@nohost/_config/admins/' + userData.name, userData.password)
      .pipe(catchError(this.passwordError('Error changing admin password')),
      switchMap((response) => {
        return of(response);
      }));
  }

  ownAccount(userDetail?) {
    const user = userDetail || this.userDetail;
    return user.name === this.loggedUser.name;
  }

}
