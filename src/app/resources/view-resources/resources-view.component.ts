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

@Component({
  templateUrl: './resources-view.component.html',
  styles: [ `
    :host iframe {
      width: 80vw;
      height: 80vh;
      border: none;
    }
    .resRating {
      display: grid;
      max-width: 230px;
      margin-left: auto;
    }
    .rating {
      text-align: center;
    }
    $gray: #aaa;

    body{
      background: black;
      color: white;
    }
    .container{
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      .section{
        display: flex;
        height: 200px;
        align-items: center;
        justify-content: center;
        .block{
          border: 1px solid $gray;
          border-radius: 3px;
          margin:16px;
          padding: 40px;
          .margin-vertical-8{
            margin: 8px 0;
          }
        }
      }
    }

    .star-rating{
        .to-rate{
            cursor: pointer;
            padding: 0 3px;
        }
        .fa-star-o{
            color: orange;
        }
        .fa-star{
            color: orange;
        }
        .fa-star-half-o{
            color: orange;
        }
        .to-display{
            padding: 0 2px;
        }
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
    private userService: UserService
  ) { }

  private dbName = 'resources';
  private onDestroy$ = new Subject<void>();
  mRating;
  fRating;
  resource: any;
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  couchSrc = '';
  subscription;
  score: number = 0;
  displayRatingScore = 4;

  ngOnInit() {
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;

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

  rate(){
  }

  onRateChange = (score) => {
    this.score = score;
  }

}
