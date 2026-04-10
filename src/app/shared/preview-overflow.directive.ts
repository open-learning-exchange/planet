import { AfterViewInit, Directive, ElementRef, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[planetPreviewOverflow]',
  standalone: false
})
export class PreviewOverflowDirective implements AfterViewInit, OnDestroy {
  @Output() planetPreviewOverflowChange = new EventEmitter<boolean>();

  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frameId: number | null = null;
  private lastEmitted: boolean | null = null;
  private readonly onWindowResize = () => this.scheduleMeasure();

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private ngZone: NgZone,
  ) {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.scheduleMeasure();

      this.mutationObserver = new MutationObserver(() => this.scheduleMeasure());
      this.mutationObserver.observe(this.elementRef.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
        this.resizeObserver.observe(this.elementRef.nativeElement);
      }

      window.addEventListener('resize', this.onWindowResize, { passive: true });
    });
  }

  ngOnDestroy() {
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
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
        this.ngZone.run(() => this.planetPreviewOverflowChange.emit(hasOverflow));
      }
      this.frameId = null;
    });
  }
}
