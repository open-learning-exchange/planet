import { Component, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

@Component({
  template: `
    <span class="margin-lr-5">Showing {{table.filteredData.length}} of {{table.data.length}}
      <ng-container i18n>{labelFor, select,
        resources {{table.data.length, plural, =0 {resources} =1 {resource} other {resources}}}
        courses {{table.data.length, plural, =0 {courses} =1 {course} other {courses}}}
      }</ng-container>
    </span>
  `,
  selector: 'planet-filtered-amount'
})
export class FilteredAmountComponent {

  @Input() table = new MatTableDataSource();
  @Input() labelFor = 'resources';

}
