import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'planet-compare-resources',
  templateUrl: './compare-resources.component.html'
})

export class ResourcesCompareComponent implements OnChanges {

  @Input() resourceDetail: any = {};
  resource: any = {};
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  resourceId: string;

  ngOnChanges() {
    this.resource = this.resourceDetail;
    this.resourceId = this.resource._id;
  }

  setResourceUrl(resourceUrl: string) {
    this.resourceSrc = resourceUrl;
  }

}
