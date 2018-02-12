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
          <span class="dashboard-item" *ngFor="let i of items;let odd=odd" [ngClass]="{'bg-grey': odd}">{{'Item '+i}}</span>
        </div>
        <div class="dashboard-arrows bg-grey">
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
  items = Array(10).fill(0).map((val, ind, arr) => {
    return ind
  });

  constructor() { }

}
