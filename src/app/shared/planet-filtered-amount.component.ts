import { Component, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

@Component({
  template: `
    <span class="margin-lr-5">Showing {{table.filteredData.length}} of {{table.data.length}} resource(s)</span>
  `,
  selector: 'planet-filtered-amount'
})
export class FilteredAmountComponent {

  @Input() table = new MatTableDataSource();

}
