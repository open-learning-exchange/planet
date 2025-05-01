import { Component, Input, ViewEncapsulation, OnChanges, Output, EventEmitter } from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { truncateText } from './utils';

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
  @Output() previewed = new EventEmitter<boolean>();
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

    this.images = this._extractImageUrls(this.content);
    const textOnly = this.content.replace(/!\[.*?\]\(.*?\)/g, '');

    // Scale down md headers and check for other styles
    if (this.previewMode) {
      const scaledContent = this.content.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
      const adjustedLimit = this._calculateAdjustedLimit();

      this.previewed.emit(this.content.length > adjustedLimit || this.images.length > 0);
      this.limitedContent = truncateText(scaledContent, adjustedLimit);
    } else {
      this.limitedContent = truncateText(textOnly, this.limit);
    }
  }

  private _calculateAdjustedLimit(): number {
    const hasMdStyles = /#{1,6}\s+.+/g.test(this.content);
    const hasLists = /^(\*|-|\d+\.)\s+/gm.test(this.content);
    const hasTables = /^\|(.+)\|/gm.test(this.content);
    const scaleFactor = hasLists ? 0.2 : hasTables ? 0.55 : hasMdStyles ? 0.8 : 1;

    return Math.floor(this.limit * scaleFactor);
  }

  private _extractImageUrls(content: string): string[] {
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
