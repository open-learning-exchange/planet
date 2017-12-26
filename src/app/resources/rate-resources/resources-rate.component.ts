import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { findDocuments } from '../../shared/mangoQueries';

import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import {
  FormBuilder,
  FormGroup,
} from '@angular/forms';

@Component({
  templateUrl: './resources-rate.component.html'
})
export class ResourcesRateComponent implements OnInit {
  ratingForm: FormGroup;
  addInfo: { parentId: string, user: any } = { parentId: '', user: {} };
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
    this.addRating(this.ratingForm.value);
  }

  getExistingRating() {
    return this.couchService.post(this.ratingDb + '/_find', findDocuments({
      // Selector
      'user.name': this.addInfo.user.name,
      'parentId': this.addInfo.parentId
    },
      // Fields
      [ '_id', '_rev' ]
    ));
  }

  addRating(ratingInfo) {
    this.getExistingRating().pipe(switchMap((result: any) => {
      const uploadDoc = { ...ratingInfo, ...this.addInfo, type: 'resource' };
      if (result.docs.length === 0) {
        return this.couchService.post(this.ratingDb, uploadDoc);
      } else {
        const docInfo = result.docs[0];
        return this.couchService.put(this.ratingDb + '/' + docInfo._id + '?rev=' + docInfo._rev, uploadDoc);
      }
    })).subscribe(res => {
      this.router.navigate([ '/resources' ]);
    }, err => console.log(err));
  }

}
