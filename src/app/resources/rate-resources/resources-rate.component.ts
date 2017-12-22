import { switchMap } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

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

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  private dbName = 'rating';

  resource = {};
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  couchSrc = '';

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => {
        this.getResource(params.get('id'));
        this.id = params.get('id');
    }))
      .subscribe(resource => {
          this.resource = resource;
        });
  }

  getResource(id: string) {
    return this.couchService.get(this.dbName + '/' + id)
      .then((data) => {
        // openWhichFile is used to label which file to start with for HTML resources
        const filename = data.openWhichFile || Object.keys(data._attachments)[0];
        this.mediaType = data.mediaType;
        this.contentType = data._attachments[filename].content_type;
        this.resourceSrc = this.urlPrefix + data._id + '/' + filename;
        if (this.mediaType === 'pdf' || this.mediaType === 'HTML') {
          this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
          this.couchSrc = environment.couchAddress + this.dbName + '/' + data._id + '/' + filename;
        }
        return data;
      }, (error) => console.log('Error'));
  }

  createForm() {
    this.ratingForm = this.fb.group({
        id: '',
        rating: [ '',
        Validators.compose([
            // we are using a higher order function so we  need to call the validator function
            Validators.min(0),
            Validators.max(100)
          ])
        ],
        gender: this.fb.array([])
    });
    this.ratingForm.patchValue({
        id: this.id
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
      await this.couchService.post(this.dbName, { ...ratingInfo });
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
