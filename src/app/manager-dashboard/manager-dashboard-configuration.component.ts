import { Component } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { ConfigurationComponent } from '../configuration/configuration.component';

@Component({
    template: `
    <mat-toolbar>
      <a mat-icon-button routerLink="/manager"><mat-icon>arrow_back</mat-icon></a>
      <span i18n>Planet Configuration</span>
    </mat-toolbar>
    <planet-configuration></planet-configuration>
  `,
    imports: [MatToolbar, MatIconAnchor, RouterLink, MatIcon, ConfigurationComponent]
})
export class ManagerDashboardConfigurationComponent { }
