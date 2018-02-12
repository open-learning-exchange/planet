import { Component, Input } from '@angular/core';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  template: `
    <mat-card class="dashboard-card">
      <div class="left-tile accent-color">
        <mat-icon svgIcon={{cardTitle}}></mat-icon>
        <span>{{cardTitle}}</span>
      </div>
      <div class="right-tile">
        <div class="dashboard-items">
          <mat-card class="dashboard-item-card" *ngFor="let i of [1,2,3,4,5,6]">{{'Item '+i}}</mat-card>
        </div>
        <div class="dashboard-arrows">
          <span><mat-icon>keyboard_arrow_right</mat-icon></span>
          <span><mat-icon>keyboard_arrow_left</mat-icon></span>
        </div>
      </div>
    </mat-card>
  `,
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent {
  @Input() cardTitle: string;
  @Input() color: string;

  constructor() {}

}
