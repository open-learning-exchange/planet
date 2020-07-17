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

  constructor(
    private stateService: StateService,
  ) {}

  @Input() content: string;
  @Input() imageSource: 'nation' | 'local' = 'local';
  parentDomain;
  couchAddress;

  ngOnChanges() {
    this.parentDomain = this.stateService.configuration.parentDomain;
    this.couchAddress = this.imageSource === 'nation' ? environment.parentProtocol + '//' + this.parentDomain + ':2200' : `${environment.couchAddress}/`;
  }
}
