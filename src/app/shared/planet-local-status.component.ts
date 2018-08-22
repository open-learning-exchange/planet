import { Component, Input } from '@angular/core';

@Component({
  'selector': 'planet-local-status',
  'template': `
    <ng-container [ngSwitch]="status">
      <mat-icon *ngSwitchCase="'match'" i18n-title title="Upto date">done_all</mat-icon>
      <mat-icon *ngSwitchCase="'newerAvailable'" i18n-title title="Newer">fiber_new</mat-icon>
      <mat-icon *ngSwitchCase="'parentOlder'" i18n-title title="Older">timelapse</mat-icon>
      <mat-icon *ngSwitchCase="'mismatch'" i18n-title title="Does not match">priority_high</mat-icon>
    </ng-container>
  `
})
export class PlanetLocalStatusComponent {
  @Input() status: string;
}
