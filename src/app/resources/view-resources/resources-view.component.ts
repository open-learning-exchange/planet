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
        this.resource_activity(resource._id, 'visit');
        this.setResource(resource);
        this.getResourceRating(resource._id);
      }, error => console.log(error), () => console.log('complete getting resource id'));
  }

  getRating(sum, timesRated) {
    let rating = 0;
    if (sum > 0 && timesRated > 0) {
      rating = sum / timesRated;
    }
    // Multiply by 20 to convert rating out of 5 to percent for width
    return (rating * 20) + '%';
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
        let rateSum = 0;
        let hasRated = 0;
        let totalRating = 0;
        let maleRating = 0;
        let femaleRating = 0;
        rating.docs.map(rate => {
          if (this.userService.get().roles.indexOf('_admin') > -1) {
            hasRated = (rate.user === this.userService.get().name) ? rate.rate : hasRated;
          } else {
            hasRated = (rate.user.name === this.userService.get().name) ? rate.rate : hasRated;
          }
          totalRating++;
          if (rate.user.gender) {
            switch (rate.user.gender) {
              case 'male':
                          maleRating++;
                          break;
              case 'female':
                            femaleRating++;
                            break;
            }
          }
          rateSum = rateSum + parseInt(rate.rate, 10);
        });
        this.resource.rating = rateSum;
        this.resource.hasRated = hasRated;
        this.resource.femaleRating = femaleRating === 0 ? 0 : ((femaleRating / totalRating) * 100).toFixed(0);
        this.resource.maleRating = maleRating === 0 ? 0 : ((maleRating / totalRating) * 100).toFixed(0);
        this.resource.totalRating = totalRating;
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
          this.rating(res);
        }
      });
  }

  rating(rating) {
    if (rating) {
      const user = this.userService.get().roles.indexOf('_admin') > -1 ? this.userService.get().name : this.userService.get().profile;
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

  resource_activity(resourceId, activity) {
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
