import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CommunityListComponent } from './community-list.component';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './community-list-dialog.component.html',
    styles: [`
    :host mat-dialog-content {
      min-width: 33vw;
    }
  `],
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CommunityListComponent, MatDialogActions, MatButton]
})
export class CommunityListDialogComponent {

  selected: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  listSubmit() {
    this.data.okClick(this.selected);
  }

  selectionChange(planet) {
    if (planet.selected) {
      this.selected.push(planet);
    } else {
      this.selected = this.selected.filter(selectedPlanet => planet._id !== selectedPlanet._id);
    }
  }

}
