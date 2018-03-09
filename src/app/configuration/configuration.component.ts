import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';

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
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private router: Router
  ) { }

  ngOnInit() {
    const url = require('url');
    const adr = environment.couchAddress;
    const localhost = url.parse(adr, true);
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
      local_domain: [ localhost.host, Validators.required ],
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
    this.couchService.get('nations/_all_docs?include_docs=true', {}, environment.centerAddress)
      .subscribe((response) => {
        this.nations = response.rows.map(nations => {
          return nations.doc;
        }).filter(nt  => {
          return nt['_id'].indexOf('_design') !== 0;
        });
      }, (error) => (error));
  }

  onChange(selectedValue: string) {
    this.nationOrCommunity = selectedValue;
    if (selectedValue === 'nation') {
      this.configurationFormGroup.patchValue({
        planet_type: selectedValue,
        parent_domain: environment.centerAddress
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
      const configuration = Object.assign({ registrationRequest: 'pending' }, this.configurationFormGroup.value, this.contactFormGroup.value);
      let userDetail = { 'name': this.loginForm.value.username,
            'password': this.loginForm.value.password,
            roles: [],
            'type': 'user',
            'isUserAdmin': true,
            'firstName': this.contactFormGroup.value.firstName,
            'middleName': this.contactFormGroup.value.middleName,
            'lastName': this.contactFormGroup.value.lastName,
            'email': this.contactFormGroup.value.email,
            'phoneNumber': this.contactFormGroup.value.phoneNumber
          }
      forkJoin([
        this.couchService.put('_node/nonode@nohost/_config/admins/' + this.loginForm.value.username, this.loginForm.value.password),
        this.couchService.put('_users/org.couchdb.user:' + this.loginForm.value.username, userDetail),
        this.couchService.post('configurations', configuration),
        this.couchService.post('communityregistrationrequests', configuration, {}, configuration.parent_domain)
      ]).debug('Sending request to parent planet').subscribe((data) => {
        userDetail['request_id'] =  data[3].id;
        this.couchService.put('/_users/org.couchdb.user:' + this.loginForm.value.username,
          userDetail, {}, configuration.parent_domain)
            .subscribe((res) => console.log(res)), (error) => (error);
        this.planetMessageService.showMessage('Admin created: ' + data[1].id.replace('org.couchdb.user:', ''));
        this.router.navigate([ '/login' ]);
      }, []);
    }
  }

}
