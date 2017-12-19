import { switchMap } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

import { ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  templateUrl: './resources-view.component.html',
  styles: [ `
    :host iframe {
      width: 80vw;
      height: 80vh;
      border: none;
    }
  ` ]
})
export class ResourcesViewComponent implements OnInit {

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  private dbName = 'resources';

  resource = {};
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  couchSrc = '';

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getResource(params.get('id'))))
      .subscribe(resource => this.resource = resource);
  }

  getResource(id: string) {
    return this.couchService.get(this.dbName + '/' + id)
      .then((data) => {
        // openWhichFile is used to label which file to start with for HTML resources
        const filename = data.openWhichFile || Object.keys(data._attachments)[0];
        this.mediaType = data.mediaType;
        this.contentType = data._attachments[filename].content_type;
        this.resourceSrc = this.urlPrefix + data._id + '/' + filename;
        if (this.mediaType === 'pdf' || this.mediaType === 'HTML') {
          this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
          this.couchSrc = environment.couchAddress + this.dbName + '/' + data._id + '/' + filename;
        }
        return data;
      }, (error) => console.log('Error'));
  }

}
