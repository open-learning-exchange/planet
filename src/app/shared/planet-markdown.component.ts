import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { calculateMdAdjustedLimit, extractMarkdownImageUrls, getMarkdownPreviewText,
  markdownImageRegex, normalizeMarkdownWhitespace, truncateText
} from './utils';

import { TdFlavoredMarkdownComponent } from '@covalent/flavored-markdown';

@Component({
  selector: 'planet-markdown',
  template: `
    @if (previewMode) {
      <td-flavored-markdown [content]="limitedContent"></td-flavored-markdown>
      @if (images?.length) {
        <div class="image-gallery">
          @for (image of images; track image) {
            <img [src]="image" class="minified-image" alt="Preview Image" />
          }
        </div>
      }
    } @else {
      <td-flavored-markdown [content]="content" [hostedUrl]="couchAddress"></td-flavored-markdown>
    }
    `,
  styleUrls: ['./planet-markdown.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [TdFlavoredMarkdownComponent]
})
export class PlanetMarkdownComponent implements OnChanges {

  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  @Input() previewMode: boolean;
  @Input() limit = 450;
  couchAddress: string;
  images: string[] = [];
  limitedContent: string;

  constructor(private stateService: StateService) {}

  ngOnChanges() {
    this.couchAddress = this.imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;

    this.content = normalizeMarkdownWhitespace(this.content);

    this.images = this.extractImageUrls(this.content);
    const previewText = getMarkdownPreviewText(this.content);
    const textOnly = this.content.replace(new RegExp(markdownImageRegex), '');

    if (this.previewMode) {
      this.limitedContent = truncateText(previewText, calculateMdAdjustedLimit(previewText, this.limit));
    } else {
      this.limitedContent = truncateText(textOnly, this.limit);
    }
  }

  extractImageUrls(content: string): string[] {
    return extractMarkdownImageUrls(content).map(url => url.startsWith('http') ? url : `${this.couchAddress}${url}`);
  }
}
