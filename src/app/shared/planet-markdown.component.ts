import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';

@Component({
  selector: 'planet-markdown',
  template: '<td-markdown [content]="content" [hostedUrl]="couchAddress"></td-markdown>',
  styleUrls: [ './planet-markdown.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class PlanetMarkdownComponent implements OnChanges {

  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  parentDomain: string;
  couchAddress: string;

  constructor(
    private stateService: StateService,
  ) {}

  ngOnChanges() {
    this.parentDomain = this.stateService.configuration.parentDomain;
    this.couchAddress = this.imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.parentDomain}/` : `${environment.couchAddress}/`;
  }
}
