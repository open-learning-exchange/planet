import { Component, Input, ViewEncapsulation, OnChanges, ChangeDetectionStrategy } from '@angular/core';
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
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanetMarkdownComponent implements OnChanges {

  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  @Input() previewMode: boolean;
  @Input() limit: number;
  couchAddress: string;
  images: string[] = [];
  limitedContent: string;
  imageMarkdownRegex = /!\[[^\]]*\]\((.*?\.(?:png|jpe?g|gif)(?:\?.*?)?)\)/g;
  private cachedContent?: string;
  private cachedPreviewMode?: boolean;
  private cachedLimit?: number;
  private cachedImageSource?: 'parent' | 'local';

  constructor(
    private stateService: StateService,
  ) {}

  ngOnChanges() {
    const normalizedContent = this.content || '';
    const currentPreview = !!this.previewMode;
    const currentLimit = this.limit;
    const imageSource = this.imageSource || 'local';

    const contentChanged = this.cachedContent !== normalizedContent;
    const previewChanged = this.cachedPreviewMode !== currentPreview;
    const limitChanged = this.cachedLimit !== currentLimit;
    const imageSourceChanged = this.cachedImageSource !== imageSource;

    if (!contentChanged && !previewChanged && !limitChanged && !imageSourceChanged) {
      return;
    }

    this.couchAddress = imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;

    if (contentChanged || imageSourceChanged) {
      this.images = this.extractImageUrls(normalizedContent);
    }

    if (contentChanged || previewChanged || limitChanged) {
      const textOnly = normalizedContent.replace(this.imageMarkdownRegex, '');

      if (currentPreview) {
        const scaledContent = textOnly.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
        const adjustedLimit = calculateMdAdjustedLimit(scaledContent, currentLimit);

        this.limitedContent = truncateText(scaledContent, adjustedLimit);
      } else {
        this.limitedContent = truncateText(textOnly, currentLimit);
      }
    }

    this.cachedContent = normalizedContent;
    this.cachedPreviewMode = currentPreview;
    this.cachedLimit = currentLimit;
    this.cachedImageSource = imageSource;
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
