import { switchMap } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { findDocuments } from '../../shared/mangoQueries';

import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
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
  addInfo: { parentId: string, user: any };
  _id: string;
  _rev: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  private ratingDb = 'ratings';
  private resourceDb = 'resources';

  ngOnInit() {
    this.addInfo.user = this.userService.get();
    this.addInfo.parentId = this.route.snapshot.paramMap.get('id');
  }

  createForm() {
    this.ratingForm = this.fb.group({
        rating: 0,
        comment: ''
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
    try {
      const result = await this.couchService.post(this.ratingDb + '/_find', findDocuments({
          // Selector
          'user._id': this.addInfo.user._id,
          'parentId': this.addInfo.parentId
        },
        // Fields
        [ '_id', '_rev' ]
      ));
      const uploadDoc = { ...ratingInfo, ...this.addInfo };
      if (result.docs.length === 0) {
        await this.couchService.post(this.ratingDb, uploadDoc);
      } else {
        const docInfo = result.docs[0];
        await this.couchService.put(this.ratingDb + '/' + docInfo._id + '?rev=' + docInfo._rev, uploadDoc);
      }
      this.router.navigate([ '/resources' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  rating(val: number) {
    switch (val) {
      case 0:
        this.ratingForm.patchValue({ rating: '0' });
        break;
      case 1:
        this.ratingForm.patchValue({ rating: '1' });
        break;
      case 2:
        this.ratingForm.patchValue({ rating: '2' });
        break;
      case 3:
        this.ratingForm.patchValue({ rating: '3' });
        break;
      case 4:
        this.ratingForm.patchValue({ rating: '4' });
        break;
      case 5:
        this.ratingForm.patchValue({ rating: '5' });
        break;
    }
  }

}
