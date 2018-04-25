import { Directive, Input, OnInit, AfterViewChecked,
  Renderer2, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[planetHighlightRoute]'
})
export class HighligtRouteDirective implements OnInit, AfterViewChecked {

    pulsatingClassed = '';

    constructor(private renderer: Renderer2, private  elRef: ElementRef) {}

    @Input() planetHighlightRoute: any;

    // add active class and make sure routerlink is set to not always show '/' as active
    ngOnInit() {
      const obj = this.planetHighlightRoute;
      if (obj.routerLinkActive.isActive) {
        this.renderer.addClass(this.elRef.nativeElement, 'active');
      }
      obj.routerLinkActive.routerLinkActiveOptions = { exact: true };
    }

    // Purely make sure the elements are classed according to state
    ngAfterViewChecked() {
      const obj = this.planetHighlightRoute;
      if (obj.routerLinkActive.isActive) {
        this.renderer.addClass(this.elRef.nativeElement, 'active');
        this.renderer.removeClass(this.elRef.nativeElement, 'pulsate');
      } else {
        this.renderer.removeClass(this.elRef.nativeElement, 'active');
      }
    }

    // Set which class is to pulsate (bf becoming .active) and save it as state var
    @HostListener('click') onClick() {
      const clickedVal = this.elRef.nativeElement.attributes.title.value;
      this.pulsatingClassed = clickedVal;
      this.renderer.addClass(this.elRef.nativeElement, 'pulsate');
    }

}
