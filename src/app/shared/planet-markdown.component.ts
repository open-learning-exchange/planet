import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { truncateText, calculateMdAdjustedLimit } from './utils';

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
  styleUrls: [ './planet-markdown.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class PlanetMarkdownComponent implements OnChanges {

  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  @Input() previewMode: boolean;
  @Input() limit: number;
  couchAddress: string;
  images: string[] = [];
  limitedContent: string;

  constructor(
    private stateService: StateService,
  ) {}

  ngOnChanges() {
    this.couchAddress = this.imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;

    this.images = this.extractImageUrls(this.content);

    const textOnly = this.content.replace(/!\[.*?\]\(.*?\)/g, '');

    if (this.previewMode) {
      const scaledContent = textOnly.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
      const adjustedLimit = calculateMdAdjustedLimit(scaledContent, this.limit);

      this.limitedContent = truncateText(scaledContent, adjustedLimit);
    } else {
      this.limitedContent = truncateText(textOnly, this.limit);
    }
  }

  extractImageUrls(content: string): string[] {
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = imageRegex.exec(content)) !== null) {
      const url = match[1];
      matches.push(url.startsWith('http') ? url : `${this.couchAddress}${url}`);
    }
    return matches;
  }
}
