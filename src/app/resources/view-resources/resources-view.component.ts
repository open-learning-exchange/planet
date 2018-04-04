import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { UserService } from '../../shared/user.service';
import { ResourcesService } from '../resources.service';

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
    private userService: UserService,
    private resourcesService: ResourcesService
  ) { }

  private dbName = 'resources';
  private onDestroy$ = new Subject<void>();
  resource: any = {};
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  // Use string rather than boolean for i18n select
  fullView = 'off';

  ngOnInit() {
    this.route.paramMap
      .debug('Getting resource id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        const resourceId = params.get('id');
        this.resourceActivity(resourceId, 'visit');
        this.resourcesService.updateResources([ resourceId ]);
      }, error => console.log(error), () => console.log('complete getting resource id'));
    this.resourcesService.resourcesUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe((resourceArr) => {
        this.setResource(resourceArr[0]);
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
