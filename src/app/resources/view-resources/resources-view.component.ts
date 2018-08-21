import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { UserService } from '../../shared/user.service';
import { ResourcesService } from '../resources.service';
import { debug } from '../../debug-operator';

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
  // If parent route, url will use parent domain.  If not uses this domain.
  parent = this.route.snapshot.data.parent;
  get urlPrefix()  {
    let domain = environment.couchAddress + '/';
    if (this.parent) {
      domain = 'http://' + this.userService.getConfig().parentDomain + '/';
    }
    return domain + this.dbName + '/';
  }
  // Use string rather than boolean for i18n select
  fullView = 'on';
  resourceId: string;

  ngOnInit() {
    this.route.paramMap
      .pipe(debug('Getting resource id from parameters'), takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        this.resourceId = params.get('id');
        const getOpts: any = { resourceIds: [ this.resourceId ] };
        if (this.parent) {
          getOpts.opts = { domain: this.userService.getConfig().parentDomain };
        }
        this.resourceActivity(this.resourceId, 'visit');
        this.resourcesService.updateResources(getOpts);
      }, error => console.log(error), () => console.log('complete getting resource id'));
    this.resourcesService.resourcesUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe((resourceArr) => {
        this.resource = resourceArr[0];
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setResourceUrl(resourceUrl: string) {
    this.resourceSrc = resourceUrl;
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

  updateRating(itemId) {
    this.resourcesService.updateResources({ resourceIds: [ itemId ], updateCurrentResources: true });
  }

}
