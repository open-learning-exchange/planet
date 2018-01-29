import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { ValidatorService } from '../../validators/validator.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../../validators/custom-validators';

import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

@Component({
  templateUrl: './users-profile.component.html'
})
export class UsersProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  name = '';
  roles = [];
  urlName = '';

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private dialogsFormService: DialogsFormService,
    private validatorService: ValidatorService
  ) { }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    this.profileView();
  }

  profileView() {
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName).subscribe((response) => {
      const { derived_key, iterations, password_scheme, salt, ...userDetail } = response;
      this.userDetail = userDetail;
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      }
    }, (error) => {
      console.log(error);
    });
  }

  onSubmit(credentialData, userDetail) {
    const updateDoc = Object.assign({ password: credentialData.password }, userDetail);
    this.changePasswordRequest(updateDoc).pipe(switchMap((response) => {
      if (response.ok === true) {
        this.userDetail._rev = response._rev;
        return this.reinitSession(userDetail.name, credentialData.password);
      }
      return of({ ok: false, reason: 'Error changing password' });
    })).subscribe((res) => {
      if (res.ok === true) {
        // TODO: Should notify user that password successfully changed or that there was an error
      }
    });
  }

  changePasswordRequest(userData) {
    return this.couchService.put(this.dbName + '/' + userData._id, userData);
  }

  reinitSession(username, password) {
    return this.couchService.post('_session', { 'name': username, 'password': password }, { withCredentials: true });
  }

  changePasswordForm(userDetail) {
    const title = 'Change Password';
    const type = 'user';
    const fields =
      [
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
    const validation = {
      password: [
        '',
        Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('password', true)
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
    this.dialogsFormService
      .confirm(title, type, fields, validation, '')
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.onSubmit(res, userDetail);
        }
      });
  }
}
