import { Component, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

@Component({
  template: `
    <span>Showing {{table.filteredData.length}} of {{table.data.length}} resource(s)</span>
  `,
  selector: 'planet-filtered-amount',
  styles: [ `
    :host {
      padding: 0 2vw;
    }
  ` ]
})
export class FilteredAmountComponent {

  @Input() table = new MatTableDataSource();

}
