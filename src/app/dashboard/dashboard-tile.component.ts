import { Component, Input, OnInit, OnChanges } from '@angular/core';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent implements OnInit, OnChanges {
  @Input() cardTitle: string;
  @Input() color: string;
  @Input() itemData;
  items = Array(5).fill(0).map((val, ind, arr) => {
    return ind;
  });

  displayIndex = 0;
  displayItems = [];

  constructor() { }

  ngOnInit() {
    if (this.itemData) {
      this.items = [];
    } else {
      this.itemData = { items: [] };
    }
  }

  ngOnChanges() {
    this.resetDisplayItems();
  }

  resetDisplayItems() {
    if (this.itemData) {
      this.displayItems = this.itemData.items.slice(this.displayIndex, this.displayIndex + 5);
    }
  }

  arrowClick(direction: number) {
    let newIndex = this.displayIndex + (direction * 5);
    newIndex = (newIndex < 0 || newIndex > this.itemData.items.length) ? 0 : newIndex;
    this.displayIndex = newIndex;
    this.resetDisplayItems();
  }


}
