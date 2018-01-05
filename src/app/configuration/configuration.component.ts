import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { MatStepper } from '@angular/material';

import { Observable } from 'rxjs/Observable';
@Component({
  templateUrl: './configuration.component.html',
  styleUrls: [ './configuration.component.scss' ]
})
export class ConfigurationComponent implements OnInit {
  message = '';
  select = '';
  loginForm: FormGroup;
  secondFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  nations = [];

  constructor(
    private _formBuilder: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
  ) {
   }

  ngOnInit() {
    this.loginForm = this._formBuilder.group({
      username: [ '', Validators.required ],
      password: [ '', Validators.required ],
      confirmPassword: [ '', Validators.required ]
    });
    this.secondFormGroup = this._formBuilder.group({
      communityName: [ '', Validators.required ],
      code: [ '', Validators.required ],
      nationName: [ '', Validators.required ],
      nationUrl: [ '', Validators.required ],
      language: [ '', Validators.required ]
    });
    this.contactFormGroup = this._formBuilder.group({
      firstName: [ '', Validators.required ],
      lastName: [ '', Validators.required ],
      middleName: [ '' ],
      email: [ '', Validators.required ],
      phoneNumber: [ '', Validators.required ]
    });
    this.getNationList();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      if (this.loginForm.value.password === this.loginForm.value.confirmPassword) {
        this.couchService.put('_node/nonode@nohost/_config/admins/' + this.loginForm.value.username, this.loginForm.value.password)
          .subscribe((data) => {
            this.message = 'User created please click Next button';
          }, (error) => this.message = 'user not created');
      } else {
        this.message = 'Passwords do not match';
      }
    }
  }

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .subscribe((data) => {
        for (let i = 0; i < data.rows.length; i++) {
          if (data.rows[i].doc['_id'].indexOf('_design') === -1) {
            this.nations.push(data.rows[i].doc.name);
          }
        }
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  onChange(selectedValue: string) {
    this.select = selectedValue;
  }

  onSubmitConfiguration() {
    if (this.secondFormGroup.valid && this.contactFormGroup.valid) {
      const data = Object.assign({}, this.secondFormGroup.value, this.contactFormGroup.value);
      this.couchService.post('configurations', data).subscribe(() => {
      //this.router.navigate([ '' ]);
      }, (err) => {
        // Connect to an error display component to show user that an error has occurred
        console.log(err);
      });
    }
  }

}
