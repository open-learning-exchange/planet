import { switchMap } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { environment } from '../../environments/environment';

@Component({
  template: `
    <div [ngSwitch]="mediaType">
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
    </div>
  `
})
export class ResourcesViewComponent implements OnInit {

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
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
        this.mediaType = data.mediaType;
        this.contentType = data._attachments[id].content_type;
        this.resourceSrc = this.urlPrefix + data._id + '/' + data.filename;
        if (this.mediaType === 'pdf') {
          this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
        }
        return data;
      }, (error) => console.log('Error'));
  }

}
