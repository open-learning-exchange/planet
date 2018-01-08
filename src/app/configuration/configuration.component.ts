import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';

@Component({
  templateUrl: './configuration.component.html'
})
export class ConfigurationComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  message = '';
  select = '';
  loginForm: FormGroup;
  configurationFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  nations = [];

  constructor(
    private _formBuilder: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this._formBuilder.group({
      username: [ '', Validators.required ],
      password: [ '', Validators.required ],
      confirmPassword: [ '', Validators.required ]
    });
    this.configurationFormGroup = this._formBuilder.group({
      planet_type: [ '', Validators.required ],
      local_domain: [ '', Validators.required ],
      name: [ '', Validators.required ],
      parent_domain: [ '', Validators.required ],
      preferred_lang: [ '', Validators.required ],
      code: [ '', Validators.required ]
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

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .subscribe((data) => {
        for (let i = 0; i < data.rows.length; i++) {
          if (data.rows[i].doc['_id'].indexOf('_design') === -1) {
            this.nations.push(data.rows[i].doc);
          }
        }
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  onChange(selectedValue: string) {
    this.select = selectedValue;
    if (this.select === 'community') {
      this.configurationFormGroup = this._formBuilder.group({
        planet_type: [ 'community', Validators.required ],
        local_domain: [ 'localhost:3000/configurations', Validators.required ],
        parent_domain: [ '', Validators.required ],
        name: [ '', Validators.required ],
        preferred_lang: [ '', Validators.required ],
        code: [ '', Validators.required ]
      });
    } else {
      this.configurationFormGroup = this._formBuilder.group({
        planet_type: [ 'nation', Validators.required ],
        name: [ '', Validators.required ],
        parent_domain: [ 'nbs.ole.org:5997', Validators.required ],
        local_domain: [ '', Validators.required ],
        preferred_lang: [ '', Validators.required ],
        code: [ '', Validators.required ]
      });
    }
  }

  checkPassword() {
    if (this.loginForm.value.password === this.loginForm.value.confirmPassword) {
      this.stepper.selectedIndex = 1;
      this.message = '';
    } else {
      this.message = 'Passwords do not match';
    }
  }

  onSubmitConfiguration() {
    if (this.loginForm.valid && this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      this.couchService.put('_node/nonode@nohost/_config/admins/' + this.loginForm.value.username, this.loginForm.value.password)
        .subscribe((data) => {
          const config = Object.assign({}, this.configurationFormGroup.value, this.contactFormGroup.value);
          this.couchService.post('configurations', config).subscribe(() => {
          this.router.navigate([ 'login' ]);
          }, (err) => {
            // Connect to an error display component to show user that an error has occurred
            console.log(err);
          });
        }, (error) => (error));
    }
  }

  cancel() {
    this.router.navigate([ 'login' ]);
  }

}
