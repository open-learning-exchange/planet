import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators, FormControlName } from '@angular/forms';
import { MatRadioModule , MatFormFieldModule, MatButtonModule, MatInputModule } from '@angular/material';
import { ValidatorService } from '../validators/validator.service';

import { UserData } from './UserData';


@Component({
  templateUrl: './register.component.html'
})
export class RegisterComponent {

  registerForm: FormGroup;
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  RegistrationMsg: String;
  uniqueUser: String;
  dbName = '_users';

  constructor(
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private fg: FormBuilder
    ) {
      this.createform();
  }

  registerUser(userInfo: UserData ) {
    this.RegistrationMsg = '';
    if (userInfo.password === userInfo.repeatPassword) {
      this.checkAdminExistence().then((noAdmin) => {
        if (noAdmin) {
          this.createAdmin(userInfo);
        } else {
          this.createNonAdmin(userInfo);
        }
      });
    }else {
      this.RegistrationMsg = 'Passwords do not Match!';
    }
  }

  createNonAdmin(userInfo: UserData) {
    const name = userInfo.login;
    const password = userInfo.password;
    this.couchService.put('_users/org.couchdb.user:' + name,
    { 'name': name, 'password': password, 'userData': userInfo, 'roles': [], 'type': 'user' })
    .then((data) => {
      this.RegistrationMsg = 'Your registration is successful';
    }, (error) => {
      this.RegistrationMsg = 'Error, Could not register';
    });
  }

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs')
    .then((data) => {
      return true;
    }, (error) => {
      return false;
    });
  }

  createAdmin(userInfo: UserData) {
    this.couchService.put('_node/nonode@nohost/_config/admins/' + userInfo.login, userInfo.password).then((data) => {
      this.RegistrationMsg = 'Your registration is successful';
    }, (error) => {
      this.RegistrationMsg = 'Error, Could not register';
    });
  }
  // isUserNameUnique(UserInfo: UserData) {
  //   return this.ValidatorService.checkUnique('_users', UserInfo.login);
  // }

  createform() {
    this.registerForm = this.fg.group({
      firstName: [ '', Validators.required ],
      middleName: [ '', Validators.required ],
      lastName: [ '', Validators.required ],
      login: [ '', Validators.required,  ac => this.validatorService.isUnique$(this.dbName, 'name', ac) ],
      Emails: [ '', [ Validators.required,  Validators.pattern ('[^ @]*@[^ @]*') ] ],
      password: [ '', Validators.required ],
      repeatPassword: [ '', Validators.required ],
      language: [ '', Validators.required ],
      phoneNumber: [ '', Validators.required ],
      birthDay: [ '', Validators.required ],
      gender: [ '', Validators.required ],
      level: [ '', Validators.required ],
      community: [ '', Validators.required ],
      region: [ '', Validators.required ],
      nation: [ '', Validators.required ],
    });
  }
}
