import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'planet-configuration',
  templateUrl: './configuration.component.html'
})
export class ConfigurationComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  nationOrCommunity = 'community';
  message = '';
  loginForm: FormGroup;
  configurationFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  nations = [];

  constructor(
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: [ '', Validators.required ],
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
    });
    this.configurationFormGroup = this.formBuilder.group({
      planet_type: [ '', Validators.required ],
      local_domain: [ document.baseURI, Validators.required ],
      name: [ '', Validators.required ],
      parent_domain: [ '', Validators.required ],
      preferred_lang: [ '', Validators.required ],
      code: [ '', Validators.required ]
    });
    this.contactFormGroup = this.formBuilder.group({
      firstName: [ '', Validators.required ],
      lastName: [ '', Validators.required ],
      middleName: [ '' ],
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      phoneNumber: [ '', Validators.required ]
    });
    this.getNationList();
  }

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .subscribe((data) => {
        this.nations = data.rows.map(nations => {
          return nations.doc;
        }).filter(nt  => {
          return nt['_id'].indexOf('_design') !== 0;
        });
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  onChange(selectedValue: string) {
    this.nationOrCommunity = selectedValue;
    if (selectedValue === 'nation') {
      this.configurationFormGroup.patchValue({
        planet_type: selectedValue,
        parent_domain: 'nbs.ole.org:5997'
      });
    } else {
      this.configurationFormGroup.patchValue({
        planet_type: selectedValue,
        parent_domain: ''
      });
    }
  }

  onSubmitConfiguration() {
    if (this.loginForm.valid && this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      this.couchService.put('_node/nonode@nohost/_config/admins/' + this.loginForm.value.username, this.loginForm.value.password)
        .subscribe((data) => {
          const config = Object.assign({}, this.configurationFormGroup.value, this.contactFormGroup.value);
          this.couchService.post('configurations', config).subscribe(() => {
            this.router.navigate([ '/login' ]);
          }, (err) => {
            // Connect to an error display component to show user that an error has occurred
            console.log(err);
          });
        }, (error) => (error));
    }
  }

}
