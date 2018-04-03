import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../../validators/custom-validators';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './users-profile.component.html',
  styles: [ `
    .space-container {
      margin: 64px 30px;
    }
    .view-container {
      background-color: #FFFFFF;
      padding: 3rem;
    }
    .user_data {
      padding: 3rem;
    }
  ` ]
})
export class UsersProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail: any = {};
  user: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  urlName = '';

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.user = this.userService.get();
    this.profileView();
  }

  profileView() {
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.user = this.userService.get();
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
    this.changePasswordRequest(updateDoc).pipe(switchMap((responses) => {
      if (responses.reduce((ok, r) => r.ok && ok, true)) {
        this.userDetail._rev = responses[0].rev;
        return this.reinitSession(userDetail.name, credentialData.password);
      }
      return of({ ok: false, reason: 'Error changing password' });
    })).subscribe((res) => {
      if (res.ok === true) {
        this.planetMessageService.showMessage('Password successfully updated');
      }
    }, (error) => this.planetMessageService.showMessage('Error changing password'));
  }

  changePasswordRequest(userData) {
    const isUserAdmin = this.userService.get().isUserAdmin;
    const observables = [
      this.couchService.put(this.dbName + '/' + userData._id, userData)
    ];
    if (isUserAdmin) {
      observables.push(
        this.couchService.put('_node/nonode@nohost/_config/admins/' + userData.name, userData.password)
      );
    }
    return forkJoin(observables);
  }

  reinitSession(username, password) {
    return this.couchService.post('_session', { 'name': username, 'password': password }, { withCredentials: true });
  }

  changePasswordForm(userDetail) {
    const title = 'Change Password';
    const fields = this.newChangePasswordFormFields();
    const formGroup = this.newChangePasswordFormGroup();
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.onSubmit(res, userDetail);
        }
      });
  }

  newChangePasswordFormFields() {
    return [
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
  }

  newChangePasswordFormGroup() {
    return {
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
  }

  goBack() {
    const currentUser = this.userService.get();
    if (currentUser.isUserAdmin) {
      this.router.navigate([ '/users' ]);
    } else {
      this.router.navigate([ '/' ]);
    }
  }

}
