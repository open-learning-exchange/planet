import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';

@Directive({ selector: '[planetPreviewOverflow]' })
export class PreviewOverflowDirective implements AfterViewInit, OnDestroy {
  @Output() planetPreviewOverflowChange = new EventEmitter<boolean>();

  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frameId: number | null = null;
  private lastEmitted: boolean | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.mutationObserver = new MutationObserver(() => this.scheduleMeasure());
      this.mutationObserver.observe(this.elementRef.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy() {
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
  }

  private scheduleMeasure() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    this.frameId = requestAnimationFrame(() => {
      const element = this.elementRef.nativeElement;
      const hasOverflow = element.scrollHeight - element.clientHeight > 1;
      if (hasOverflow !== this.lastEmitted) {
        this.lastEmitted = hasOverflow;
        // Outside the zone, markForCheck batches every preview reporting this frame into one change detection pass
        this.planetPreviewOverflowChange.emit(hasOverflow);
        this.changeDetectorRef.markForCheck();
      }
      this.frameId = null;
    });
  }
}
