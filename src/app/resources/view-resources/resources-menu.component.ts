import { Component, Input, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { environment } from '../../../environments/environment';
import { DialogsResourcesViewerComponent } from '../../shared/dialogs/dialogs-resources-viewer.component';

@Component({
  selector: 'planet-resources-menu',
  template: `
    <button mat-raised-button [color]="color" class="margin-lr-10" [matMenuTriggerFor]="resourceList" (click)="buttonClick(resources)">
      <ng-content></ng-content>
    </button>
    <mat-menu #resourceList="matMenu">
      <button mat-menu-item
        *ngFor="let resource of resources"
        [disabled]="!resource._attachments"
        (click)="openResource(resource._id)">
        {{resource.title}}
      </button>
    </mat-menu>
  `
})
export class ResourcesMenuComponent {

  @Input() resources: any[] = [];
  @Input() color = 'accent';
  @ViewChild(MatMenuTrigger) resourceButton: MatMenuTrigger;

  constructor(
    private dialog: MatDialog,
  ) {}

  resourceUrl(resource) {
    if (resource._attachments && Object.keys(resource._attachments)[0]) {
      const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
      return environment.couchAddress + '/resources/' + resource._id + '/' + filename;
    }
  }

  openResource(resourceId) {
    this.dialog.open(DialogsResourcesViewerComponent, { data: { resourceId }, autoFocus: false });
  }

  buttonClick(resources) {
    if (resources.length === 1) {
      this.openResource(resources[0]._id);
      this.resourceButton.closeMenu();
    }
  }

}
