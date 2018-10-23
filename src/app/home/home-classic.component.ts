import { Component, Input, Output, EventEmitter, ViewChild, DoCheck, ElementRef } from '@angular/core';

@Component({
  selector: 'planet-home-classic',
  templateUrl: './home-classic.component.html',
  styleUrls: [ './home.scss' ]
})
export class HomeClassicComponent implements DoCheck {

  @Input() notifications = [];
  @Input() user: any = {};
  @Input() userImgSrc = '';

  @ViewChild('toolbar', { read: ElementRef }) toolbar: ElementRef;
  isScreenTooNarrow: boolean = false;
  @Output() sizeChange = new EventEmitter(true);

  @Input() logoutClick: any = () => {};
  @Input() readNotification: any = () => {};
  @Input() backgroundRoute: any = () => {};

  constructor() {}

  ngDoCheck() {
    const isScreenTooNarrow = window.innerWidth < this.toolbar.nativeElement.offsetWidth;
    if (this.isScreenTooNarrow !== isScreenTooNarrow) {
      this.isScreenTooNarrow = isScreenTooNarrow;
      this.sizeChange.emit(this.isScreenTooNarrow);
    }
  }

}
