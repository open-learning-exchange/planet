import { Component, Input, OnChanges, OnDestroy, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResourcesService } from '../resources.service';
import { StateService } from '../../shared/state.service';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  selector: 'planet-resources-viewer',
  templateUrl: './resources-viewer.component.html',
  styleUrls: [ './resources-viewer.scss' ]
})
export class ResourcesViewerComponent implements OnChanges, OnDestroy {

  @Input() resourceId: string;
  @Input() fetchRating = true;
  @Input() isDialog = false;
  @Output() resourceUrl = new EventEmitter<any>();
  mediaType: string;
  contentType: string;
  resourceSrc: string;
  shownResourceId: string;
  resource: any;
  parent = this.route.snapshot.data.parent;
  pdfSrc: any;
  private onDestroy$ = new Subject<void>();
  @ViewChild('pdfViewer') pdfViewer: ElementRef;

  constructor(
    private sanitizer: DomSanitizer,
    private resourcesService: ResourcesService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private userService: UserService,
    private couchService: CouchService,
    private router: Router
  ) {
    this.resourcesService.resourcesListener(this.parent).pipe(takeUntil(this.onDestroy$))
      .subscribe((resources) => {
        if (this.shownResourceId !== this.resourceId) {
          this.shownResourceId = this.resourceId;
          this.resource = resources.find((r: any) => r._id === this.resourceId);
          if (this.resource) {
            this.setResource(this.resource.doc);
          }
        }
      });
  }

  ngOnChanges() {
    this.resourcesService.requestResourcesUpdate(this.parent, this.fetchRating);
  }

  get urlPrefix() {
    let domain = environment.couchAddress + '/resources/';
    if (this.parent) {
      domain = 'http://' + this.stateService.configuration.parentDomain + '/resources/';
    }
    return domain;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  resourceActivity(resource: any, activity) {
    const data = {
      'resourceId': resource._id,
      'title': resource.title,
      'user': this.userService.get().name,
      'type': activity,
      'time': this.couchService.datePlaceholder,
      'createdOn': this.stateService.configuration.code,
      'parentCode': this.stateService.configuration.parentCode,
      'url': this.router.url,
      'private': resource.private
    };
    this.couchService.updateDocument('resource_activities', data)
      .subscribe((response) => {
      }, (error) => console.log('Error'));
  }

  setResource(resource: any) {
    this.resourceActivity(resource, 'visit');

    // Check if this is an H5P embed resource
    if (resource.openWith === 'H5P' && resource.h5pUrl) {
      this.mediaType = 'h5p';
      this.resourceSrc = resource.h5pUrl;
      this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
      this.resourceUrl.emit(this.resourceSrc);
      return;
    }

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
    if (
      this.contentType === 'text/html' || this.contentType === 'text/markdown' ||
      this.contentType === 'text/plain' || this.contentType === 'application/json'
    ) {
      this.mediaType = 'HTML';
      this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
    }
    // Emit resource src so parent component can use for links
    this.resourceUrl.emit(this.resourceSrc);
  }

  openFullscreen() {
    const elem = this.pdfViewer.nativeElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }
  }

}
