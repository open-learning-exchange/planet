import { Directive, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
    selector: '[planetClickOutside]'
})
export class ClickOutsideDirective {
    constructor(private _elementRef: ElementRef) {}

    @Output() public planetClickOutside = new EventEmitter();

    @HostListener('document:click', [ '$event.target' ])
    public onClick(targetElement) {

        const clickedInside = this._elementRef.nativeElement.contains(targetElement);
        if (!clickedInside) {
            this.planetClickOutside.emit(null);
        }
    }
}
