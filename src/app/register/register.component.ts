import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, Validators, FormControlName } from '@angular/forms';
import { MatRadioModule , MatFormFieldModule, MatButtonModule, MatInputModule } from '@angular/material';
import { ValidatorService } from '../validators/validator.service';
import { UserData } from './UserData';
import { Observable } from 'rxjs/Observable';

@Component({
  templateUrl: './register.component.html'
})
export class RegisterComponent {

  registerForm: FormGroup;
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  RegistrationMsg: String;
  uniqueUser: String;

  constructor(
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private fg: FormBuilder
    ) {
    this.createform();
  }

  registerUser(userInfo: UserData ) {
    if (userInfo.password !== userInfo.repeatPassword) {
      this.RegistrationMsg = 'Passwords do not Match!';
    }else {
      this.RegistrationMsg = '';
      this.checkifUniqueUsrName(userInfo.login).then((uniqUsr) => {
        if (uniqUsr) {
          this.uniqueUser = '';
          this.checkAdminExistence().then((noAdmin) => {
            if (noAdmin) {
              this.createAdminUser(userInfo);
            } else {
              this.createNonAdminUser(userInfo);
            }
          });
        } else {
          this.uniqueUser = 'The login is already taken, please try another one.';
        }
      });
    }
  }

  checkifUniqueUsrName(login: string) {
    return new Promise(dt =>
      this.couchService.put('_users/org.couchdb.user:' + login, { 'name': login, 'password': ' ', 'roles': [], 'type': 'user' })
      .subscribe((data) => {
        dt(true);
      }, (error) =>  {
        dt(false);
      })
    );
  }

  createNonAdminUser(userInfo: UserData) {
    const name = userInfo.login;
    const password = userInfo.password;
    this.couchService.put('_users/org.couchdb.user:' + name,
    { 'name': name, 'password': password, 'userData': userInfo, 'roles': [], 'type': 'user' })
    .subscribe((data) => {
      this.RegistrationMsg = 'Your registration is successful';
    }, (error) => {
      this.RegistrationMsg = 'Error, Could not register';
    });
  }

  checkAdminExistence() {
    return new Promise(dt =>
      this.couchService.get('_users/_all_docs')
      .subscribe((data) => {
        dt(true);
      }, (error) => {
        dt(false);
      })
    );
  }

  createAdminUser(userInfo: UserData) {
    this.couchService.put('_node/nonode@nohost/_config/admins/' + userInfo.login, userInfo.password)
    .subscribe((data) => {
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

