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
      <td-markdown [content]="sanitizedContent" [hostedUrl]="couchAddress"></td-markdown>
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
  sanitizedContent: string;
  imageMarkdownRegex = /!\[[^\]]*\]\((.*?\.(?:png|jpe?g|gif)(?:\?.*?)?)\)/g;

  constructor(
    private stateService: StateService,
  ) {}

  ngOnChanges() {
    this.couchAddress = this.imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;

    this.sanitizedContent = this.normalizeWhitespace(this.content || '');
    this.images = this.extractImageUrls(this.sanitizedContent);
    const textOnly = this.sanitizedContent.replace(this.imageMarkdownRegex, '');

    if (this.previewMode) {
      const scaledContent = textOnly.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
      const adjustedLimit = calculateMdAdjustedLimit(scaledContent, this.limit);

      this.limitedContent = truncateText(scaledContent, adjustedLimit);
    } else {
      this.limitedContent = truncateText(textOnly, this.limit);
    }
  }

  normalizeWhitespace(content: string): string {
    // Replace excessive consecutive whitespace (tabs, newlines, spaces) with reasonable limits
    // Replace sequences of tabs/spaces with max 2 spaces
    content = content.replace(/[ \t]+/g, (match) => match.length > 2 ? '  ' : match);
    // Replace excessive newlines (more than 2 consecutive) with just 2 newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
  }

  extractImageUrls(content: string): string[] {
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = this.imageMarkdownRegex.exec(content)) !== null) {
      const url = match[1];
      matches.push(url.startsWith('http') ? url : `${this.couchAddress}${url}`);
    }
    return matches;
  }
}
