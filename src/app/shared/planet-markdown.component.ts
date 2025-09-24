import { Component, Input, ViewEncapsulation, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { truncateText, calculateMdAdjustedLimit, converter } from './utils';

@Component({
  selector: 'planet-markdown',
  template: `
    <ng-container *ngIf="previewMode; else noPreview">
      <div [innerHTML]="previewHtml" class="markdown"></div>
      <div class="image-gallery" *ngIf="images?.length">
        <img *ngFor="let image of images" [src]="image" class="minified-image" alt="Preview Image" />
      </div>
    </ng-container>
    <ng-template #noPreview>
      <div [innerHTML]="fullHtml" class="markdown"></div>
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
  fullHtml: SafeHtml;
  previewHtml?: SafeHtml;
  private imageMarkdownRegex = /!\[[^\]]*\]\((.*?\.(?:png|jpe?g|gif)(?:\?.*?)?)\)/g;
  private cachedContent?: string;
  private cachedPreviewMode?: boolean;
  private cachedLimit?: number;
  private cachedImageSource?: 'parent' | 'local';

  constructor(
    private stateService: StateService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnChanges() {
    const normalizedContent = this.content || '';
    const preview = !!this.previewMode;
    const limit = typeof this.limit === 'number' ? this.limit : normalizedContent.length;
    const imageSource = this.imageSource || 'local';

    const contentChanged = this.cachedContent !== normalizedContent;
    const previewChanged = this.cachedPreviewMode !== preview;
    const limitChanged = this.cachedLimit !== limit;
    const sourceChanged = this.cachedImageSource !== imageSource;

    if (!contentChanged && !previewChanged && !limitChanged && !sourceChanged) {
      return;
    }

    this.couchAddress = imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;

    if (contentChanged || sourceChanged) {
      this.images = this.extractImageUrls(normalizedContent);
      this.fullHtml = this.sanitizer.bypassSecurityTrustHtml(converter.makeHtml(normalizedContent));
    }

    if (preview && (contentChanged || limitChanged || previewChanged || sourceChanged)) {
      const textOnly = normalizedContent.replace(this.imageMarkdownRegex, '');
      const scaledContent = textOnly.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
      const adjustedLimit = calculateMdAdjustedLimit(scaledContent, limit);
      const truncated = truncateText(scaledContent, adjustedLimit);
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(converter.makeHtml(truncated));
    } else if (!preview) {
      this.previewHtml = undefined;
    }

    this.cachedContent = normalizedContent;
    this.cachedPreviewMode = preview;
    this.cachedLimit = limit;
    this.cachedImageSource = imageSource;
  }

  extractImageUrls(content: string): string[] {
    this.imageMarkdownRegex.lastIndex = 0;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = this.imageMarkdownRegex.exec(content)) !== null) {
      const url = match[1];
      matches.push(url.startsWith('http') ? url : `${this.couchAddress}${url}`);
    }
    return matches;
  }
}
