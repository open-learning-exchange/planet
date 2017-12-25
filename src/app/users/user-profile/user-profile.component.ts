import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { Location } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  user: any;
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup;

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private userService: UserService
  ) {
    this.userData();
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }

  userData() {
    this.editForm = this.fb.group({
      firstName: [ '', Validators.required ],
      middleName: '',
      lastName: [ '', Validators.required ],
      login: [ '', Validators.required ],
      email: [ '', [ Validators.required,  Validators.pattern ('[^ @]*@[^ @]*') ] ],
      language: [ '', Validators.required ],
      phoneNumber: [ '', Validators.required ],
      birthDate: [ '', Validators.required ],
      gender: [ '', Validators.required ],
      level: [ '', Validators.required ]
    });
    this.editForm.setValue({firstName: '', middleName: '', lastName: '', login: '', email: '', language: ''
      , phoneNumber: '', birthDate: '', gender: '', level: ''});
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.userService.get().name)
      .then((data) => {
        this.user = data;
        this.editForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
  }

  onSubmit() {
    if (this.editForm.valid) {
      this.updateUser(Object.assign({}, this.user, this.editForm.value));
    } else {
        Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  async updateUser(userInfo) {
    // ...is the rest syntax for object destructuring
    try {
      await this.couchService.put(this.dbName + '/org.couchdb.user:' + this.userService.get().name, { ...userInfo });
      this.router.navigate([ '' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  cancel() {
    this.location.back();
  }
}
