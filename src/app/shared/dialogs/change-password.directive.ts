import { Directive, HostListener, Input } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { debug } from '../../debug-operator';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { StateService } from '../state.service';

const changePasswordFields = [
  {
    'label': 'Old Password',
    'type': 'password',
    'name': 'oldPassword',
    'placeholder': 'Old Password',
    'showPassword': false,
    'required': true
  },
  {
    'label': 'Password',
    'type': 'password',
    'name': 'password',
    'placeholder': 'Password',
    'showPassword': false,
    'required': true
  },
  {
    'label': 'Confirm Password',
    'type': 'password',
    'name': 'confirmPassword',
    'placeholder': 'Confirm Password',
    'showPassword': false,
    'required': true
  }
];

@Directive({
  selector: '[planetChangePassword]'
})
export class ChangePasswordDirective {

  @Input('planetChangePassword') userDetail: any;
  dbName = '_users';
  changePasswordFormGroup = {
    oldPassword: [ '', Validators.required, ac => this.validatorService.checkOldPassword$(ac) ],
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
    private stateService: StateService
  ) {}

  @HostListener('click')
  openChangePasswordForm() {
    const title = 'Change Password';
    this.dialogsFormService
      .confirm(title, changePasswordFields, this.changePasswordFormGroup)
      .pipe(debug('Dialog confirm'))
      .subscribe((res) => {
        if (res !== undefined) {
          this.changePassword(res, this.userDetail || this.userService.get());
        }
      });
  }

  changePassword(credentialData, userDetail) {
    const updateDoc = Object.assign({ password: credentialData.password }, userDetail);
    this.changePasswordRequest(updateDoc).pipe(switchMap((responses) => {
      return forkJoin([ ...responses.map(r => of(r)), this.reinitSession(userDetail.name, credentialData.password) ]);
    })).subscribe((responses) => {
      const errors = responses.filter(r => r.ok === false);
      if (errors.length === 0) {
        this.planetMessageService.showMessage('Password successfully updated');
      } else {
        this.planetMessageService.showAlert(errors.map(e => e.reason).join(' & '));
      }
    }, (error) => this.planetMessageService.showAlert('Error changing password'));
  }

  changePasswordRequest(userData) {
    // Manager role also has isUserAdmin true so check role to be empty
    const isUserAdmin = (this.userService.get().isUserAdmin && !this.userService.get().roles.length);
    return this.couchService.put(this.dbName + '/' + userData._id, userData).pipe(switchMap((res) => {
      if (isUserAdmin) {
        return forkJoin([ of(res), this.updateAdminPassword(userData), this.updatePasswordOnParent(userData) ]);
      }
      return of(res);
    }));
  }

  passwordError(reason: string) {
    return () => {
      return of({ ok: false, reason: reason });
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

}
