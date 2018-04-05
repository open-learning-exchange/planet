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
import { switchMap } from 'rxjs/operators';

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
    const localDomain = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;
    this.loginForm = this.formBuilder.group({
      name: [ '', Validators.required ],
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
      local_domain: [ localDomain, Validators.required ],
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
    this.couchService.get('nations/_all_docs?include_docs=true', { domain: environment.centerAddress })
      .subscribe((response) => {
        this.nations = response.rows.map(nations => {
          return nations.doc;
        }).filter(nt  => {
          return nt['_id'].indexOf('_design') !== 0;
        });
      }, (error) => this.planetMessageService.showMessage('There is a problem getting the list of nations'));
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
      const configuration = Object.assign({ registrationRequest: 'pending' },
        this.configurationFormGroup.value, this.contactFormGroup.value);
      const { confirmPassword, ...credentials } = this.loginForm.value;
      const userDetail: any = {
        ...credentials,
        'roles': [],
        'type': 'user',
        'isUserAdmin': true,
        ...this.contactFormGroup.value
      };
      forkJoin([
        // When
        this.couchService.put('_node/nonode@nohost/_config/admins/' + this.loginForm.value.username, this.loginForm.value.password),
        this.couchService.put('_users/org.couchdb.user:' + this.loginForm.value.username, userDetail),
        this.couchService.post('configurations', configuration),
        this.couchService.post('communityregistrationrequests', configuration, { domain: configuration.parent_domain })
          .pipe(switchMap(data => {
            userDetail['request_id'] =  data.id;
            userDetail['isUserAdmin'] =  false;
            return this.couchService.put('/_users/org.couchdb.user:' + this.loginForm.value.username,
              userDetail, { domain: configuration.parent_domain });
          })),
      ]).debug('Sending request to parent planet').subscribe((data) => {
        this.planetMessageService.showMessage('Admin created: ' + data[1].id.replace('org.couchdb.user:', ''));
        this.router.navigate([ '/login' ]);
      }, (error) => this.planetMessageService.showMessage('There was an error creating planet');
    }
  }

}

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and '/'
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)\//.exec(str)[1];
};
