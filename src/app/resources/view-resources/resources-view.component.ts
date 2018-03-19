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

@Component({
  templateUrl: './resources-view.component.html',
  styleUrls: [ './resources-view.scss' ]
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
  resource: any = {};
  rating: any = { average: 0, userRating: { rate: '', comment: '' } };
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  couchSrc = '';
  subscription;
  // Use string rather than boolean for i18n select
  fullView = 'off';

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'))))
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

  getResource(id: string) {
    if (this.router.url === '/resources/view/parent/' + id) {
      this.urlPrefix = 'http://' + this.userService.getConfig().parent_domain + '/' + this.dbName + '/';
      return this.couchService.get('resources/' + id, {}, this.userService.getConfig().parent_domain);
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
      .subscribe((ratings) => {
        // Counts number of ratings, number of male/female ratings, adds the total rating sum,
        // and gets the logged in user's rating if applicable.
        const { rateSum, userRating, femaleCount, maleCount, totalCount } = ratings.docs.reduce((stats, rating) => {
          stats.userRating = (rating.user.name === this.userService.get().name) ? rating : stats.userRating;
          stats.totalCount++;
          switch (rating.user.gender) {
            case 'male':
              stats.maleCount++;
              break;
            case 'female':
              stats.femaleCount++;
              break;
          }
          stats.rateSum = stats.rateSum + parseInt(rating.rate, 10);
          return stats;
        }, { rateSum: 0, userRating: '', totalCount: 0, maleCount: 0, femaleCount: 0 });
        Object.assign(this.rating, {
          femalePercent: femaleCount === 0 ? 0 : ((femaleCount / totalCount) * 100).toFixed(0),
          malePercent: maleCount === 0 ? 0 : ((maleCount / totalCount) * 100).toFixed(0),
          average: totalCount === 0 ? 0 : rateSum / totalCount,
          userRating, totalCount });
      }, error => console.log(error));
  }

  openRatingDialog(resource_id) {
    const title = 'Rating';
    const type = 'rating';
    const fields =
      [
        { 'label': 'Rate', 'type': 'rating', 'name': 'rate', 'placeholder': 'Your Rating', 'required': false },
        { 'label': 'Comment', 'type': 'textarea', 'name': 'comment', 'placeholder': 'Leave your comment', 'required': false }
      ];
    const formGroup = {
      rate: [ this.rating.userRating.rate || '', Validators.required ],
      comment: [ this.rating.userRating.comment || '' ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
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
      if (this.rating) {
        Object.assign(ratingData,
          { _id: this.rating.userRating._id, _rev: this.rating.userRating._rev });
      }
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

  toggleFullView() {
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

}
