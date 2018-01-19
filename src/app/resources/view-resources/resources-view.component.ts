import { Component, OnInit, OnDestroy, Directive } from '@angular/core';
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
    private userService: UserService,
    private dialogsFormService: DialogsFormService
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
  ratings: any;

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'), params.get('nationname'))))
      .debug('Getting resource id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((resource) => {
        this.resource_activity(resource._id, 'visit');
        this.setResource(resource);
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
    // resource rating
    this.couchService.get('ratings/_all_docs?include_docs=true')
      .subscribe((data) => {
        this.ratings = data.rows.map(ratings => {
          return ratings.doc;
        }).filter(rt  => {
          return rt['type'] === 'resource' && rt['item'] === resource._id;
        });
        let rate_sum = 0;
        let has_rated = 0;
        let total_rating = 0;
        let male_rating = 0;
        let female_rating = 0;
        this.ratings.map(rate => {
          has_rated = (rate.user === this.userService.get().name) ? rate.rate : has_rated;
          total_rating++;
          (rate.gender === 'M') ? male_rating++ : female_rating++ ;
          rate_sum = rate_sum + parseInt(rate.rate, 10);
        });
        this.resource.rating = rate_sum;
        this.resource.has_rated = has_rated;
        this.resource.female_rating = (female_rating / total_rating) * 100;
        this.resource.male_rating = (male_rating / total_rating) * 100;
        this.resource.total_rating = total_rating;
      }, (error) => console.log(error));
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

  rate(resource_id) {
    const title = 'Rating';
    const type = 'rating';
    // need to show star rating insted of typebox
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
          const datas = {
            'user': this.userService.get().name,
            'gender': 'M', // gender need to fetch from profile (need to work on admin part)
            'item': resource_id,
            'type': 'resource',
            'rate': res.rate,
            'comment': res.comment,
            'time': Date.now()
          };
          this.couchService.post('ratings', datas)
            .subscribe((data) => {
              location.reload();
            }, (error) => console.log(error));
        }
      });
  }

}
