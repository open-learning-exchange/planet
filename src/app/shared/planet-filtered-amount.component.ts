import { Component, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

@Component({
  template: `
    <span>Showing {{table.filteredData.length}} of {{table.data.length}}
      <ng-container i18n>{labelFor, select,
        resources {{table.data.length, plural, =0 {resources} =1 {resource} other {resources}}}
        courses {{table.data.length, plural, =0 {courses} =1 {course} other {courses}}}
      }</ng-container>
    </span>
  `,
  selector: 'planet-filtered-amount',
  styles: [ `
    :host {
      padding: 0 0.5rem;
    }
  ` ]
})
export class FilteredAmountComponent {

  @Input() table = new MatTableDataSource();
  @Input() labelFor = 'resources';

}
