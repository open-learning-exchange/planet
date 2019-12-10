import { Component, Input } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-markdown',
  template: '<td-markdown [content]="content" [hostedUrl]="couchAddress"></td-markdown>'
})
export class PlanetMarkdownComponent {

  @Input() content: string;
  couchAddress = `${environment.couchAddress}/`;

}
