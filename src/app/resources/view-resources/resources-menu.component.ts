import { Component, Input, ViewChild } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MatMenuTrigger } from '@angular/material';

@Component({
  selector: 'planet-resources-menu',
  template: `
    <button mat-raised-button color="accent" class="margin-lr-10" [matMenuTriggerFor]="resourceList" (click)="buttonClick(resources)">
      <ng-content></ng-content>
    </button>
    <mat-menu #resourceList="matMenu">
      <a *ngFor="let resource of resources;" mat-menu-item [href]="resourceUrl(resource)" target="_blank">{{resource.title}}</a>
    </mat-menu>
  `
})
export class ResourcesMenuComponent {

  @Input() resources: any[] = [];
  @ViewChild(MatMenuTrigger) resourceButton: MatMenuTrigger;

  constructor() {}

  resourceUrl(resource) {
    if (resource._attachments && Object.keys(resource._attachments)[0]) {
      const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
      return environment.couchAddress + '/resources/' + resource._id + '/' + filename;
    }
  }

  buttonClick(resources) {
    if (resources.length === 1) {
      window.open(this.resourceUrl(resources[0]), '_blank');
      this.resourceButton.closeMenu();
    }
  }

}
