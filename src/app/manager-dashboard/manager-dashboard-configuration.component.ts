import { Component } from '@angular/core';

@Component({
  template: `
    <mat-toolbar>
      <a mat-icon-button routerLink="/manager"><mat-icon>arrow_back</mat-icon></a>
      <span i18n>Planet Configuration</span>
    </mat-toolbar>
    <planet-configuration></planet-configuration>
  `
})
export class ManagerDashboardConfigurationComponent { }
