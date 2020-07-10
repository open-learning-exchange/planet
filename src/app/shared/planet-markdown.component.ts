import { Component, Input, ViewEncapsulation } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-markdown',
  template: '<td-markdown [content]="content?.text || content" [hostedUrl]="couchAddress"></td-markdown>',
  styleUrls: [ './planet-markdown.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class PlanetMarkdownComponent {

  @Input() content: any;
  couchAddress = `${environment.couchAddress}/`;

}
