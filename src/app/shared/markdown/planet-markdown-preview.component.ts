import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Injector, Input, NgZone, OnChanges, OnDestroy, Output,
  SimpleChanges, ViewChild, afterNextRender
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { doesMarkdownPreviewTruncate, hasMarkdownImages } from '@shared/utils';

import { PlanetMarkdownComponent } from './planet-markdown.component';

@Component({
  selector: 'planet-markdown-preview',
  template: `
    <div #preview [class.preview-content]="!expanded">
      <planet-markdown [content]="content" [imageSource]="imageSource" [previewMode]="!expanded"></planet-markdown>
    </div>
    @if (expanded || hasHiddenContent || overflowing) {
      <div class="preview-toggle">
        <button mat-icon-button type="button" class="km-preview-toggle" [attr.aria-expanded]="expanded"
          i18n-aria-label aria-label="Full description" (click)="expandedChange.emit(!expanded)">
          <mat-icon>{{ expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    .preview-content {
      height: 9rem;
      overflow: hidden;
    }

    .preview-toggle {
      text-align: center;
    }
  `],
  imports: [ MatIconButton, MatIcon, PlanetMarkdownComponent ]
})
export class PlanetMarkdownPreviewComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  @Input() expanded = false;
  @Output() expandedChange = new EventEmitter<boolean>();
  @ViewChild('preview') preview: ElementRef<HTMLElement>;
  @ViewChild(PlanetMarkdownComponent, { read: ElementRef }) markdown: ElementRef<HTMLElement>;
  hasHiddenContent = false;
  overflowing = false;
  private resizeObserver: ResizeObserver;

  constructor(
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef,
    private injector: Injector
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.content) {
      this.hasHiddenContent = hasMarkdownImages(this.content) || doesMarkdownPreviewTruncate(this.content);
    }
    // Keeps the toggle, and its focus, until the collapsed preview has been measured
    if (changes.expanded?.previousValue && !this.expanded) {
      this.overflowing = true;
    }
    afterNextRender({ read: () => this.measureOverflow() }, { injector: this.injector });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.measureOverflow());
      this.resizeObserver.observe(this.markdown.nativeElement);
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private measureOverflow() {
    const preview = this.preview.nativeElement;
    const overflowing = preview.scrollHeight - preview.clientHeight > 1;
    if (overflowing !== this.overflowing) {
      this.overflowing = overflowing;
      // Outside the zone, markForCheck batches every preview reporting this frame into one change detection pass
      this.changeDetectorRef.markForCheck();
    }
  }

}
