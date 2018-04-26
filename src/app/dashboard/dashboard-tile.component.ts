import { Component, Input, OnInit, AfterViewChecked, HostListener, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MeetupService } from '../meetups/meetups.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent implements OnInit, AfterViewChecked {
  @Input() cardTitle: string;
  @Input() color: string;
  @Input() itemData;
  @ViewChild('items') itemDiv: ElementRef;
  mockItems = Array(100).fill(0).map((val, ind, arr) => {
    return { title: 'Item ' + ind, link: '/' };
  });

  private _isRightDisabled = true;
  get isRightDisabled() {
    return this._isRightDisabled;
  }
  set isRightDisabled(newVal: boolean) {
    this._isRightDisabled = newVal;
    // Need to manually tell Angular to run change detection for disabling button
    this.changeDetectorRef.detectChanges();
  }

  displayProps = {
    displayIndex: 0,
    width: 0,
    // Tiles are 150px wide, set by css
    itemWidth: 150
  };

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private meetupService: MeetupService
  ) { }

  ngOnInit() {
    if (!this.itemData) {
      this.itemData = this.mockItems;
    }
  }

  ngAfterViewChecked() {
    this.displayProps.width = this.itemDiv.nativeElement.offsetWidth;
    this.isRightDisabled = this.checkRightDisable();
  }

  @HostListener('window:resize', [ '$event' ])
  onResize(event) {
    this.displayProps.width = this.itemDiv.nativeElement.offsetWidth;
    // Recheck max index and slide tiles to adjust if needed.
    this.displayProps.displayIndex = Math.min(this.displayProps.displayIndex, this.maxIndex());
    this.isRightDisabled = this.checkRightDisable();
  }

  itemTranslate() {
    const { displayIndex, itemWidth } = this.displayProps;
    return 'translateX(-' + (displayIndex * itemWidth) + 'px)';
  }

  tilesInView(): number {
    return Math.floor(this.displayProps.width / this.displayProps.itemWidth);
  }

  maxIndex(): number {
    // Minimum index is 0
    return Math.max(0, this.itemData.length - (this.displayProps.width / this.displayProps.itemWidth));
  }

  arrowClick(direction: number) {
    let newIndex = this.displayProps.displayIndex + (direction * this.tilesInView());
    // Buttons should disable before allowing index out of range,
    // but keeping this to make sure items are always viewable
    newIndex = (newIndex < 0 || newIndex > this.itemData.length - 1) ? 0 : newIndex;
    this.displayProps.displayIndex = Math.min(newIndex, this.maxIndex());
  }

  // Disable the right button if there is no more content.
  checkRightDisable() {
    return this.displayProps.displayIndex > this.itemData.length - this.tilesInView() - 1;
  }

  onClick(itemId, group) {
    // switch is used since we have other group as well which will be implemented later...
    switch (group) {
      case 'myMeetups' :
                        this.meetupService.attendMeetup(itemId, 'left');
                        break;
    }
  }

}
