import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
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
  isUserEnrolled = false;
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
        this.resourceActivity(this.resourceId, 'visit');
        this.resourcesService.requestResourcesUpdate(this.parent);
      }, error => console.log(error), () => console.log('complete getting resource id'));
    this.resourcesService.resourcesListener(this.parent).pipe(takeUntil(this.onDestroy$))
      .subscribe((resources) => {
        this.resource = resources.find((r: any) => r._id === this.resourceId);
        this.isUserEnrolled = this.userService.shelf.resourceIds.includes(this.resource._id);
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
      'time': Date.now(),
      'createdOn': this.userService.getConfig().code,
      'parentDomain': this.userService.getConfig().parentDomain
    };
    this.couchService.post('resource_activities', data)
      .subscribe((response) => {
        console.log(response);
      }, (error) => console.log('Error'));
  }

  toggleFullView() {
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

  updateRating() {
    this.resourcesService.requestResourcesUpdate(this.parent);
  }

  libraryToggle(resourceId, type) {
    this.resourcesService.libraryAddRemove([ resourceId ], type).subscribe((res) => {
      this.isUserEnrolled = !this.isUserEnrolled;
    }, (error) => ((error)));
  }

}
