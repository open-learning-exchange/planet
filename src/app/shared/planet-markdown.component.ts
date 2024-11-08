import { Component, Input, ViewEncapsulation, OnChanges, ElementRef } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import mediumZoom from 'medium-zoom';

@Component({
  selector: 'planet-markdown',
  template: '<td-markdown [content]="content" [hostedUrl]="couchAddress"></td-markdown>',
  styleUrls: [ './planet-markdown.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class PlanetMarkdownComponent implements OnChanges {

  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  couchAddress: string;

  constructor(
    private stateService: StateService,
    private el: ElementRef
  ) {}

  ngOnChanges() {
    this.couchAddress = this.imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;
  }

  ngAfterViewInit() {
    mediumZoom(this.el.nativeElement.querySelectorAll('planet-markdown img'));
  }
}
