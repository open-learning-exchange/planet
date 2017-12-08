import { switchMap } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  template: `
    <div class="km-resource-view" [ngSwitch]="mediaType">
      <img [src]="resourceSrc" *ngSwitchCase="'image'">
      <video controls *ngSwitchCase="'video'">
        <source [src]="resourceSrc" [type]="contentType" />
        Browser not supported
      </video>
      <audio controls *ngSwitchCase="'audio'">
        <source [src]="resourceSrc" [type]="contentType" />
        Browser not supported
      </audio>
      <object [data]="pdfSrc" *ngSwitchCase="'pdf'" width="800" height="600"></object>
      <div *ngSwitchCase="'other'"><a class='btn btn-primary' href={{resourceSrc}}>Open File</a></div>
    </div>
  `
})
export class ResourcesViewComponent implements OnInit {

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  resource = {};
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + 'resources/';

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'))))
      .subscribe(resource => this.resource = resource);
  }

  getResource(id: string) {
    return this.couchService.get('resources/' + id)
      .then((data) => {
        // openWhichFile is used to label which file to start with for HTML resources
        const filename = data.openWhichFile || Object.keys(data._attachments)[0];
        this.mediaType = data.mediaType;
        this.contentType = data._attachments[filename].content_type;
        this.resourceSrc = this.urlPrefix + data._id + '/' + filename;
        if (this.mediaType === 'pdf') {
          this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
        }
        if (this.mediaType === 'zip') {
          this.router.navigate([ '/resources' ]);
          window.open(this.resourceSrc);
        }
        return data;
      }, (error) => console.log('Error'));
  }

}
