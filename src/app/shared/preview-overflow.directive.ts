import { AfterViewInit, Directive, ElementRef, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';

// Every preview measures in one shared frame and reports in one zone entry, so a table of previews costs one
// change detection pass instead of one per row.
const pending = new Set<PreviewOverflowDirective>();
let frameId: number | null = null;

const measurePending = () => {
  frameId = null;
  const changed = [ ...pending ].filter(directive => directive.measure());
  pending.clear();
  if (changed.length > 0) {
    changed[0].ngZone.run(() => changed.forEach(directive => directive.emit()));
  }
};

@Directive({ selector: '[planetPreviewOverflow]' })
export class PreviewOverflowDirective implements AfterViewInit, OnDestroy {
  @Output() planetPreviewOverflowChange = new EventEmitter<boolean>();

  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastEmitted: boolean | null = null;
  private readonly onWindowResize = () => this.scheduleMeasure();

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    readonly ngZone: NgZone,
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
      } else {
        window.addEventListener('resize', this.onWindowResize, { passive: true });
      }
    });
  }

  ngOnDestroy() {
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    pending.delete(this);
    if (pending.size === 0 && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  // True when the overflow changed since it was last emitted
  measure(): boolean {
    const element = this.elementRef.nativeElement;
    const hasOverflow = element.scrollHeight - element.clientHeight > 1;
    if (hasOverflow === this.lastEmitted) {
      return false;
    }
    this.lastEmitted = hasOverflow;
    return true;
  }

  emit() {
    this.planetPreviewOverflowChange.emit(this.lastEmitted);
  }

  private scheduleMeasure() {
    pending.add(this);
    if (frameId === null) {
      frameId = requestAnimationFrame(measurePending);
    }
  }
}
