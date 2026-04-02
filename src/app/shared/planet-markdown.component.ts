import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { calculateMdAdjustedLimit, extractMarkdownImageUrls, getMarkdownPreviewText,
  markdownImageRegex, normalizeMarkdownWhitespace, truncateText
} from './utils';

@Component({
  selector: 'planet-markdown',
  template: `
    <ng-container *ngIf="previewMode; else noPreview">
      <td-markdown [content]="limitedContent"></td-markdown>
      <div class="image-gallery" *ngIf="images?.length">
        <img *ngFor="let image of images" [src]="image" class="minified-image" alt="Preview Image" />
      </div>
    </ng-container>
    <ng-template #noPreview>
      <td-markdown [content]="content" [hostedUrl]="couchAddress"></td-markdown>
    </ng-template>
  `,
  styleUrls: ['./planet-markdown.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
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
