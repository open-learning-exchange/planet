import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuPanel, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { DeviceInfoService } from './device-info.service';

@Component({
  selector: 'planet-view-actions',
  template: `
    <mat-toolbar class="primary-color font-size-1">
      <ng-content></ng-content>
      @if (!isMobile()) {
        <ng-container *ngTemplateOutlet="edit()"></ng-container>
      }
      <span class="toolbar-fill"></span>
      @if (isTabletOrSmaller()) {
        <button class="km-view-actions-menu" mat-icon-button [matMenuTriggerFor]="menu()" aria-label="Actions" i18n-aria-label>
          <mat-icon>more_vert</mat-icon>
        </button>
      } @else {
        <ng-container *ngTemplateOutlet="actions()"></ng-container>
      }
    </mat-toolbar>
  `,
  // The full-height layout keeps only direct mat-toolbar children from shrinking
  styles: ':host { display: block; flex-shrink: 0; }',
  imports: [ NgTemplateOutlet, MatIconButton, MatIcon, MatMenuTrigger, MatToolbar ]
})
export class ViewActionsComponent {

  // Material only gives arrow keys to items declared inside the menu, so the page owns it
  readonly menu = input.required<MatMenuPanel>();
  readonly edit = input.required<TemplateRef<unknown>>();
  readonly actions = input.required<TemplateRef<unknown>>();
  readonly isMobile = this.deviceInfoService.isMobile;
  readonly isTabletOrSmaller = this.deviceInfoService.isTabletOrSmaller;

  constructor(private deviceInfoService: DeviceInfoService) {}

}
