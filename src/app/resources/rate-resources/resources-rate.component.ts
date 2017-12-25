import { switchMap } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

import { MatFormField, MatFormFieldControl } from '@angular/material';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormArray,
    Validators
  } from '@angular/forms';

@Component({
  templateUrl: './resources-rate.component.html'
})
export class ResourcesRateComponent implements OnInit {
  ratingForm: FormGroup;
  id: string;
  user: string;
  _id: string;
  _rev: string;
  resource = {};

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.user = this.userService.get().name;
    this.createForm();
  }

  private ratingDb = 'rating';
  private resourceDb = 'resources';

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'))))
    .subscribe(resource => this.resource = resource);
  }

  getResource(id: string) {
    return this.couchService.get(this.resourceDb + '/' + id)
      .then((data) => {
        // openWhichFile is used to label which file to start with for HTML resources
        this.id = data._id;
        return data;
      }, (error) => console.log('Error'));
  }

  createForm() {
    this.ratingForm = this.fb.group({
        id: '',
        user: '',
        rating: [ '',
        Validators.compose([
            // we are using a higher order function so we  need to call the validator function
            Validators.min(0),
            Validators.max(100)
          ])
        ],
        comment: '',
        gender: this.fb.array([])
    });
    this.ratingForm.patchValue({
        id: this.id,
        user: this.user
    });
  }

  onSubmit() {
    if (this.ratingForm.valid) {
        this.addRating(this.ratingForm.value);
      } else {
        Object.keys(this.ratingForm.controls).forEach(field => {
          const control = this.ratingForm.get(field);
          control.markAsTouched({ onlySelf: true });
        });
      }
  }

  async addRating(ratingInfo) {
    // ...is the rest syntax for object destructuring
    try {
      this.couchService.post(this.ratingDb + '/_find', {
        'selector': {
            'user': this.user,
            'id': this.id
        },
        'fields': [ '_id', '_rev', 'rating' ],
        'limit': 1,
        'skip': 0
      })
      .then((data) => {
        if (data.docs.length === 0) {
          this.couchService.post(this.ratingDb, { ...ratingInfo });
        } else {
          ratingInfo['_id'] = data.docs[0]._id;
          ratingInfo['_rev'] = data.docs[0]._rev;
          this.couchService.put(this.ratingDb + '/' + data.docs[0]._id, { ...ratingInfo });
        }
      }, (err) => console.log(err));
      this.router.navigate([ '/resources' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  isMale(val: boolean) {
      if (!val) {
          this.ratingForm.setControl('gender', this.fb.array([ 'female' ]));
      } else {
          this.ratingForm.setControl('gender', this.fb.array([ 'male' ]));
      }
  }

}
