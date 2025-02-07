import { Component, Input, ViewEncapsulation, OnChanges, AfterViewChecked, ElementRef } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import * as katex from 'katex';

@Component({
  selector: 'planet-markdown',
  template: '<td-markdown [content]="content" [hostedUrl]="couchAddress"></td-markdown>',
  styleUrls: [ './planet-markdown.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class PlanetMarkdownComponent implements OnChanges, AfterViewChecked {

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
    this.renderKaTeX();
  }

  ngAfterViewChecked() {
    this.renderKaTeX();
  }

  private renderKaTeX() {
    const elements = this.el.nativeElement.querySelectorAll('td-markdown');
    elements.forEach(element => {
      const text = element.innerHTML;
      const inlinePattern = /\((.*?)\)/g;
      const blockPattern = /\$\$(.*?)\$\$/gs;

      // Render inline LaTeX
      element.innerHTML = text.replace(inlinePattern, (match, p1) => {
        try {
          return katex.renderToString(p1, { throwOnError: false });
        } catch (error) {
          console.error('KaTeX render error:', error);
          return match;
        }
      });

      // Render block LaTeX
      element.innerHTML = element.innerHTML.replace(blockPattern, (match, p1) => {
        try {
          return katex.renderToString(p1, { throwOnError: false, displayMode: true });
        } catch (error) {
          console.error('KaTeX render error:', error);
          return match;
        }
      });
    });
  }
}
