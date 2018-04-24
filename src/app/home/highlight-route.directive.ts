import { Directive, Input, OnInit, OnChanges } from '@angular/core';

@Directive({
  selector: '[planetHighlightRoute]'
})
export class HighligtRouteDirective implements OnInit, OnChanges {

    constructor() {}

    @Input() planetHighlightRoute: any;

    ngOnInit() {
        console.log(this.planetHighlightRoute);
    }

    ngOnChanges() {
        console.log(this.planetHighlightRoute);
    }
}
