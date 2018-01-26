import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { UserService } from '../../shared/user.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';
import { findDocuments } from '../../shared/mangoQueries';
import { resolve } from 'url';

@Component({
  templateUrl: './resources-view.component.html',
  styles: [ `
    :host iframe {
      width: 80vw;
      height: 80vh;
      border: none;
    }
  ` ],
})

export class ResourcesViewComponent implements OnInit, OnDestroy {

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router,
    private http: HttpClient,
    private dialogsFormService: DialogsFormService,
    private userService: UserService
  ) { }

  private dbName = 'resources';
  private onDestroy$ = new Subject<void>();
  resource: any;
  rating: any = { average: 0 };
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  couchSrc = '';
  subscription;

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'), params.get('nationname'))))
      .debug('Getting resource id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((resource) => {
        this.resourceActivity(resource._id, 'visit');
        this.setResource(resource);
        this.getResourceRating(resource._id);
      }, error => console.log(error), () => console.log('complete getting resource id'));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getResource(id: string, nationName: string) {
    if (nationName) {
      return this.couchService.post(`nations/_find`,
      { 'selector': { 'name': nationName },
      'fields': [ 'name', 'nationurl' ] })
        .pipe(switchMap(data => {
          const nationUrl = data.docs[0].nationurl;
          if (nationUrl) {
            this.urlPrefix = 'http://' + nationUrl + '/' + this.dbName + '/';
            return this.http.jsonp(this.urlPrefix + id + '?include_docs=true&callback=JSONP_CALLBACK', 'callback');
          }
        }));
    }
    return this.couchService.get('resources/' + id);
  }

  setResource(resource: any) {
    this.resource = resource;
    // openWhichFile is used to label which file to start with for HTML resources
    const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
    this.mediaType = resource.mediaType;
    this.contentType = resource._attachments[filename].content_type;
    this.resourceSrc = this.urlPrefix + resource._id + '/' + filename;
    if (!this.mediaType) {
      const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
      this.mediaType = mediaTypes.find((type) => this.contentType.indexOf(type) > -1) || 'other';
    }
    if (this.mediaType === 'pdf' || this.mediaType === 'HTML') {
      this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
    }
    this.couchSrc = this.urlPrefix + resource._id + '/' + filename;
  }

  getResourceRating(resource_id) {
    this.couchService
      .post('ratings/_find', findDocuments({ 'item': resource_id, 'type': 'resource' }, 0 ))
      .subscribe((rating) => {
        let rateSum = 0,
          hasRated = 0,
          totalCount = 0,
          maleCount = 0,
          femaleCount = 0;
        rating.docs.map(rate => {
          hasRated = (rate.user.name === this.userService.get().name) ? rate.rate : hasRated;
          totalCount++;
          switch (rate.user.gender) {
            case 'male':
              maleCount++;
              break;
            case 'female':
              femaleCount++;
              break;
          }
          rateSum = rateSum + parseInt(rate.rate, 10);
        });
        Object.assign(this.rating, {
          femalePercent: femaleCount === 0 ? 0 : ((femaleCount / totalCount) * 100).toFixed(0),
          malePercent: maleCount === 0 ? 0 : ((maleCount / totalCount) * 100).toFixed(0),
          average: totalCount === 0 ? 0 : rateSum / totalCount,
          hasRated, totalCount });
      }, error => console.log(error));
  }

  openRatingDialog(resource_id) {
    const title = 'Rating';
    const type = 'rating';
    const fields =
      [
        { 'label': 'Rate', 'type': 'radio', 'name': 'rate', 'placeholder': 'Your Rating', 'required': false },
        { 'label': 'Comment', 'type': 'textarea', 'name': 'comment', 'placeholder': 'Leave your comment', 'required': false }
      ];
    const validation = {
      rate: [ '' ],
      comment: [ '' ]
    };
    this.dialogsFormService
      .confirm(title, type, fields, validation, '')
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.postRating(res);
        }
      });
  }

  postRating(rating) {
    if (rating) {
      const user = this.userService.get();
      const ratingData = {
        'user': user,
        'item': this.resource._id,
        'type': 'resource',
        'rate': rating.rate,
        'comment': rating.comment,
        'time': Date.now()
      };
      this.couchService.post('ratings', ratingData)
        .subscribe((data) => {
          this.getResourceRating(this.resource._id);
        }, (error) => console.log(error));
    }
  }

  resourceActivity(resourceId, activity) {
    const data = {
      'resource': resourceId,
      'user': this.userService.get().name,
      'activity': activity,
      'time': Date.now()
    };
    this.couchService.post('resource_activities', data)
      .subscribe((response) => {
        console.log(response);
      }, (error) => console.log('Error'));
  }

}
