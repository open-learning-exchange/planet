import { Component } from '@angular/core';

@Component({
  template: `
    <mat-toolbar>
      <planet-back></planet-back>
      <span i18n>Planet Configuration</span>
    </mat-toolbar>
    <planet-configuration></planet-configuration>
  `
})
export class ManagerDashboardConfigurationComponent { }
