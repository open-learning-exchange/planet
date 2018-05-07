import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent implements OnInit {
  @Input() cardTitle: string;
  @Input() color: string;
  @Input() itemData;
  @Input() emptyLink = '/';
  @ViewChild('items') itemDiv: ElementRef;
  mockItems = Array(100).fill(0).map((val, ind, arr) => {
    return { title: 'Item ' + ind, link: '/' };
  });

  constructor() { }

  ngOnInit() {
    if (!this.itemData) {
      this.itemData = this.mockItems;
    }
  }

}
