import { Directive, HostListener, Input } from '@angular/core';
// TODO add do operator?
import { forkJoin, of } from 'rxjs';
import { tap } from 'rxjs/operators'
import { switchMap, catchError } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { debug } from '../../debug-operator';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';

const changePasswordFields = [
  {
    'label': 'Old Password',
    'type': 'textbox',
    'inputType': 'password',
    'name': 'oldPassword',
    'placeholder': 'Old Password',
    'required': true
  },
  {
    'label': 'Password',
    'type': 'textbox',
    'inputType': 'password',
    'name': 'password',
    'placeholder': 'Password',
    'required': true
  },
  {
    'label': 'Confirm Password',
    'type': 'textbox',
    'inputType': 'password',
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

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService
  ) {}

  //TODO: change behavior such that a wrong password input results in an error
  @HostListener('click')
  openChangePasswordForm() {
    const title = 'Change Password';
    const onSubmit = (formGroup) => {
      this.changePassword(formGroup, this.userDetail || this.userService.get())
        .pipe(debug('Dialog onSubmit'))
        .subscribe((responses) => {
          this.showStatusOf(responses);
          this.dialogsFormService.closeDialog();
        }, (error) => this.planetMessageService.showAlert('Error changing password'));
    };
    this.dialogsFormService
      .openDialog(title, changePasswordFields, this.changePasswordFormGroup, onSubmit);
  }

  showStatusOf(responses) {
    const errors = responses.filter(response => response.ok === false);
    if (errors.length === 0) {
      this.planetMessageService.showMessage('Password successfully updated');
    } else {
      this.planetMessageService.showAlert(errors.map(e => e.reason).join(' & '));
    }
  }

  changePassword(credentialData, userDetail) {
    const updateDoc = Object.assign({ password: credentialData.password }, userDetail);

    const userHasAdminRole = this.userService.get().isUserAdmin;
    const isUserManager = this.userService.get().roles.length;
    const isUserAdmin = userHasAdminRole && !isUserManager;

    return this.makeChangePasswordRequest(updateDoc, isUserAdmin).pipe(
      switchMap((responses: any[]) => {
      return forkJoin( responses.map(r => of(r)), this.reinitSession(userDetail.name, credentialData.password, isUserAdmin) );
    }));
  }

  makeChangePasswordRequest(userData, isUserAdmin) {
    return this.couchService.put(this.dbName + '/' + userData._id, userData).pipe(switchMap((result) => {
      if (isUserAdmin) {
        return forkJoin([ of(result), this.updateAdminPassword(userData), this.updatePasswordOnParent(userData) ]);
      } else {
        return of([ result ]);
      }
    }));
  }
  reinitSession(username, password, isUserAdmin) {
    return forkJoin([
      this.updateSessionUser(username, password), 
      ...(isUserAdmin ? [this.updateSessionAdmin(password)] : [ ])
    ]).pipe(catchError(() => {
      // Silent error for now so other specific messages are shown
      return of({ ok: true });
    }));
  }
  updateSessionUser(username, password) {
    return this.couchService.post('_session', { 'name': username, 'password': password }, { withCredentials: true });
  }
  updateSessionAdmin(password) {
    return this.couchService.post('_session', { 'name': this.userService.getConfig().adminName, 'password': password },
        { withCredentials: true, domain: this.userService.getConfig().parentDomain });
  }
  updatePasswordOnParent(userData) {
    const adminName = 'org.couchdb.user:' + this.userService.getConfig().adminName;
    return this.couchService.get('_users/' + adminName , { domain: this.userService.getConfig().parentDomain })
      .pipe(catchError(this.passwordError('Error changing password in parent planet')),
      switchMap((data) => {
        if (data.ok === false) {
          return of(data);
        }
        const { derived_key, iterations, password_scheme, salt, ...profile } = data;
        profile.password = userData.password;
        return this.couchService.put(this.dbName + '/' + profile._id, profile,
          { domain: this.userService.getConfig().parentDomain });
      }));
  }

  updateAdminPassword(userData) {
    return this.couchService.put('_node/nonode@nohost/_config/admins/' + userData.name, userData.password)
      .pipe(catchError(this.passwordError('Error changing admin password')),
      switchMap((response) => {
        return of(response);
      }));
  }

  passwordError(reason: string) {
    return () => {
      return of({ ok: false, reason: reason });
    };
  }

}
