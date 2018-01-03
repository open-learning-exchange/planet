import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { CustomValidators } from '../../validators/custom-validators';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { useAnimation } from '@angular/core/src/animation/dsl';

@Component({
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail = [];
  imageSrc = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  name = '';
  urlName = '';

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private dialogsFormService: DialogsFormService
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
      } else {
        this.imageSrc = 'https://openclipart.org/image/2400px/svg_to_png/202776/pawn.png';
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
        'type':'user',
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
        '_attachments':userDetail._attachments
      };
      this.couchService.put(this.dbName+'/org.couchdb.user:'+userDetail.name, formdata)
        .subscribe((res) => {
          console.log('Success');
        }, (error) => (error));
  }

  changePasswordForm(userDetail) {
    const title = 'Change Password';
    const type = 'user';
    const fields =
      [
        { 'label': 'Password', 'type': 'textbox', 'name': 'password', 'placeholder': 'Password', 'required': true },
        { 'label': 'Repeat Password', 'type': 'textbox', 'name': 'repeatPassword', 'placeholder': 'Repeat Password', 'required': true }
      ];
    const validation = {
      password: [ '', Validators.required ],
      repeatPassword: [ '', Validators.required ]
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
