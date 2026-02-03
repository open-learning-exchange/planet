import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  templateUrl: './community-list-dialog.component.html',
  styles: [ `
    :host mat-mdc-dialog-content {
      min-width: 33vw;
    }
  ` ]
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
