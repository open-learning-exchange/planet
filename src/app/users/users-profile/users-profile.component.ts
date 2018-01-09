import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { ValidatorService } from '../../validators/validator.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';

@Component({
  templateUrl: './users-profile.component.html'
})
export class UsersProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail = [];
  imageSrc = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  name = '';
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
      this.userDetail = response;
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      }
    }, (error) => {
      console.log(error);
    });
  }

  onSubmit(data, userDetail) {
    const formdata = {
      'password': data.password,
      '_rev': userDetail._rev,
      'name': userDetail.name,
      'type': 'user',
      'roles': userDetail.roles,
      'firstName': userDetail.firstName,
      'middleName': userDetail.middleName,
      'lastName': userDetail.lastName,
      'email': userDetail.email,
      'language': userDetail.language,
      'phoneNumber': userDetail.phoneNumber,
      'birthDate': userDetail.birthDate,
      'gender': userDetail.gender,
      'level': userDetail.level,
      '_attachments': userDetail._attachments
    };
    this.couchService.put(this.dbName + '/' + userDetail._id, formdata)
      .subscribe((res) => {
        this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
          if (data.ok === true) {
            this.router.navigate([ '/login' ], {});
          }
        });
      }, (error) => (error));
}

changePasswordForm(userDetail) {
  const title = 'Change Password';
  const type = 'user';
  const fields =
    [
      { 'label': 'Password', 'type': 'password', 'name': 'password', 'placeholder': 'Password', 'required': true },
      { 'label': 'Confirm Password', 'type': 'password', 'name': 'confirmPassword', 'placeholder': 'Confirm Password', 'required': true }
    ];
  const validation = {
    password: [ '', Validators.required ],
    confirmPassword: [ '', Validators.required, ac => this.validatorService.MatchPassword$(ac, ac.parent.get('password')) ]
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
