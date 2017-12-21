import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators, FormControlName } from '@angular/forms';
import { MatRadioModule , MatFormFieldModule, MatButtonModule, MatInputModule } from '@angular/material';
import { UserData } from './UserData';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: [ './register.component.scss' ]
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  RegistrationMsg: String;

  constructor(
    private couchService: CouchService,
    private fg: FormBuilder
    ) {
      this.createform();
  }

  registerUser(userInfo: UserData ) {
    console.log(this.registerForm.controls);
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
    this.couchService.put('_users/org.couchdb.user:' + name, { 'name': name, 'password': password, 'userData': userInfo, 'roles': [], 'type': 'user' })
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

  createform() {
    this.registerForm = this.fg.group({
      firstName: [ '', Validators.required ],
      middleName: [ '', Validators.required ],
      lastName: [ '', Validators.required ],
      login: [ '', Validators.required ],
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
