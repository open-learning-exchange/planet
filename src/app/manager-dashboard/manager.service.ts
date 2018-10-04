import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { throwError, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { debug } from '../debug-operator';

const passwordFormFields = [
  {
    'label': 'Password',
    'type': 'textbox',
    'inputType': 'password',
    'name': 'password',
    'placeholder': 'Password',
    'required': true
  }
];

@Injectable()
export class ManagerService {

  constructor(
    private dialogsFormService: DialogsFormService,
    private couchService: CouchService,
    private userService: UserService
  ) {}

  openPasswordConfirmation() {
    const title = 'Admin Confirmation';
    let passwordInvalid = null;
    const formGroup = {
      password: [ '', [ Validators.required, () => passwordInvalid ] ]
    };
    return this.dialogsFormService
    .confirm(title, passwordFormFields, formGroup)
    .pipe(
      debug('Dialog confirm'),
      switchMap((response: any) => {
        if (response !== undefined) {
          return this.verifyPassword(response.password);
        }
        return throwError('Invalid password');
      }),
      catchError((err) => {
        passwordInvalid = { 'invalidPassword': true };
        return throwError(err);
      })
    );
  }

  private verifyPassword(password) {
    return this.couchService.post('_session', { name: this.userService.get().name, password })
    .pipe(switchMap((data) => {
      if (!data.ok) {
        return throwError('Invalid password');
      }
      return of({ name: this.userService.get().name, password });
    }));
  }

  addAdminLog(type) {
    const log = {
      createdOn: this.userService.getConfig().code,
      parentCode: this.userService.getConfig().parentCode,
      user: this.userService.get().name,
      time: Date.now()
    };
    return this.couchService.post('admin_activities', { ...log, type });
  }

}
