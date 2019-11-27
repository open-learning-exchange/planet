import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material';
import { DialogsViewComponent } from '../../shared/dialogs/dialogs-view.component';

@Injectable({
  providedIn: 'root'
})
export class RequestsService {

  constructor(
    private dialog: MatDialog
  ) {}

  planetTypeText(planetType) {
    return planetType === 'nation' ? 'Nation' : 'Community';
  }

  view(planet) {
    this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: planet,
        title: `${this.planetTypeText(planet.planetType)} Details`
      }
    });
  }

}
