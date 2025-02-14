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
  // NEW: Toggle for LaTeX rendering
  @Input() latexEnabled: boolean = false;

  couchAddress: string;

  constructor(
    private stateService: StateService,
    private el: ElementRef
  ) {}

  ngOnChanges() {
    this.couchAddress = this.imageSource === 'parent'
      ? `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/`
      : `${environment.couchAddress}/`;
    this.renderKaTeX();
  }

  ngAfterViewChecked() {
    this.renderKaTeX();
  }

  private renderKaTeX() {
    // Only run KaTeX processing if latexEnabled is true.
    if (!this.latexEnabled) {
      return;
    }

    const elements = this.el.nativeElement.querySelectorAll('td-markdown');
    elements.forEach(element => {
      let text = element.innerHTML;

      // Decode HTML entities
      text = this.decodeHtmlEntities(text);

      // Regex patterns
      const blockPattern = /\$\$([\s\S]*?)\$\$/g;
      const inlinePattern1 = /\\\(((?:.|\n)*?)\\\)/g;
      // Negative lookbehind ensures that escaped dollars are ignored.
      const inlinePattern2 = /(?<!\\)\$([^$]+?)(?<!\\)\$/g;

      // Render block LaTeX first
      text = text.replace(blockPattern, (match, p1) => {
        try {
          return katex.renderToString(p1.trim(), { throwOnError: false, displayMode: true });
        } catch (error) {
          return match;
        }
      });

      // Render inline LaTeX for \(...\)
      text = text.replace(inlinePattern1, (match, p1) => {
        try {
          return katex.renderToString(p1.trim(), { throwOnError: false });
        } catch (error) {
          return match;
        }
      });

      // Render inline LaTeX for $...$
      text = text.replace(inlinePattern2, (match, p1) => {
        try {
          return katex.renderToString(p1.trim(), { throwOnError: false });
        } catch (error) {
          return match;
        }
      });

      element.innerHTML = text;
    });
  }

  private decodeHtmlEntities(text: string): string {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  }
}
