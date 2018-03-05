import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { HttpHeaders, HttpClient } from '@angular/common/http';

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
    private router: Router,
    private http: HttpClient
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
    this.http.jsonp('http://nbs.ole.org:5997' + '/nations/_all_docs?include_docs=true&callback=JSONP_CALLBACK', 'callback')
      .debug('jsonp request to external nation')
      .subscribe((res: any) => {
        this.nations = res.rows.map(nations => {
          return nations.doc;
        }).filter(nt  => {
          return nt['_id'].indexOf('_design/bell') !== 0;
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
          this.couchService.put('_users/org.couchdb.user:' + this.loginForm.value.username,
          { 'name': this.loginForm.value.username, 'password': this.loginForm.value.password, roles: [], 'type': 'user',
            'isUserAdmin': true, 'firstName': this.contactFormGroup.value.firstName, 'middleName': this.contactFormGroup.value.middleName,
            'lastName': this.contactFormGroup.value.lastName, 'email': this.contactFormGroup.value.email,
            'phoneNumber': this.contactFormGroup.value.phoneNumber }).subscribe((data1) => {
             this.planetMessageService.showMessage('Admin created: ' + data1.id.replace('org.couchdb.user:', ''));
          }, (error) => this.message = '');
          const config = Object.assign({}, this.configurationFormGroup.value, this.contactFormGroup.value);
          this.couchService.post('configurations', config).subscribe(() => {
            this.router.navigate([ '/login' ]);
          }, (err) => {
            // Connect to an error display component to show user that an error has occurred
            console.log(err);
          });
        }, (error) => (error));
      const config = Object.assign({ registrationRequest: 'pending' }, this.configurationFormGroup.value, this.contactFormGroup.value);
      const headers = new HttpHeaders().set('Content-Type', 'application/json');
      const defaultOpts = { headers: headers, withCredentials: true };
      this.http.post('http://' + this.configurationFormGroup.value.parent_domain + '/communityregistrationrequests', config, defaultOpts)
        .subscribe((res: any) => {
          this.http.put('http://' + this.configurationFormGroup.value.parent_domain + '/_users/org.couchdb.user:' + this.loginForm.value.username,
          { 'name': this.loginForm.value.username,
            'password': this.loginForm.value.password,
            'roles': [],
            'type': 'user',
            'request_id': res.id,
            'planet_type': this.configurationFormGroup.value.planet_type,
            'isUserAdmin': false
          }, defaultOpts)
            .subscribe((data) => console.log(data)), (error) => (error);
        }, (error) => (error));
    }
  }

}
