import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
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
  ) {
   }

  ngAfterViewInit() {
    this.checkAdminExistence().subscribe((noAdmin) => {
      if (noAdmin) {
        this.stepper.selectedIndex = 1;
      }
    });
  }
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

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs').pipe(
      tap((data) => {
        return true; // user can see data so there is no admin
      }),
      catchError((error) => {
        return of(false); // user doesn't have permission so there is an admin
      })
    );
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

  onSubmitConfiguration() {
    if (this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      const data = Object.assign({}, this.configurationFormGroup.value, this.contactFormGroup.value);
      this.couchService.post('configurations', data).subscribe(() => {
      this.router.navigate([ 'login' ]);
      }, (err) => {
        // Connect to an error display component to show user that an error has occurred
        console.log(err);
      });
    }
  }

}
