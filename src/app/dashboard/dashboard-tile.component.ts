import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';

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

  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService
  ) { }

  ngOnInit() {
    if (!this.itemData) {
      this.itemData = this.mockItems;
    }
  }

  onClick(item, group) {
    this.userService.removeFromDashboard(item._id, group).subscribe((res) => {
      this.planetMessageService.showMessage('You have remove ' + item.title + ' from ' +  group + '.');
    });
  }

}
