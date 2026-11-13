import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import { MatDateRangeInput, MatStartDate, MatEndDate, MatDatepickerToggle, MatDateRangePicker } from '@angular/material/datepicker';
import { MatTooltip } from '@angular/material/tooltip';

import { ListToolbarComponent, ActiveFilter } from '@shared/tables/list-toolbar.component';

import { MyPlanetFiltersForm } from './filter.base';

@Component({
  selector: 'planet-myplanet-toolbar',
  templateUrl: './myplanet-toolbar.component.html',
  styleUrls: ['./myplanet.scss'],
  imports: [
    ListToolbarComponent,
    MatIconButton,
    MatIcon,
    RouterLink,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    FormsModule,
    ReactiveFormsModule,
    MatInput,
    MatDateRangeInput,
    MatStartDate,
    MatEndDate,
    MatDatepickerToggle,
    MatSuffix,
    MatDateRangePicker,
    MatButton,
    MatTooltip
  ]
})
export class MyPlanetToolbarComponent implements OnChanges {
  @Input() title = '';
  @Input() versions: string[] = [];
  @Input() selectedVersion = '';
  @Input() types: string[] = [];
  @Input() selectedType = '';
  @Input() showTypeFilter = false;
  @Input() timeFilterOptions: { label: string, value: string }[] = [];
  @Input() selectedTimeFilter = '';
  @Input() formGroup!: FormGroup<MyPlanetFiltersForm>;
  @Input() showCustomDateFields = false;
  @Input() minDate!: Date;
  @Input() today!: Date;
  @Input() searchValue = '';
  @Input() disableShowAllTime = true;
  @Output() versionChange = new EventEmitter<string>();
  @Output() typeChange = new EventEmitter<string>();
  @Output() timeFilterChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();
  @Output() resetDateFilter = new EventEmitter<void>();
  activeFilters: ActiveFilter[] = [];

  ngOnChanges() {
    const time = this.timeFilterOptions.find(option => option.value === this.selectedTimeFilter);
    this.activeFilters = [
      ...(this.showTypeFilter && this.selectedType ? [ { label: this.selectedType, clear: () => this.typeChange.emit('') } ] : []),
      ...(this.selectedVersion ? [ { label: this.selectedVersion, clear: () => this.versionChange.emit('') } ] : []),
      ...(this.disableShowAllTime ? [] : [ { label: time.label, clear: () => this.resetDateFilter.emit() } ])
    ];
  }

  onVersionChange(value: string) {
    this.versionChange.emit(value);
  }

  onTypeChange(value: string) {
    this.typeChange.emit(value);
  }

  onTimeFilterChange(value: string) {
    this.timeFilterChange.emit(value);
  }

  onSearch(value: string) {
    this.searchChange.emit(value);
  }

  onClear() {
    this.clear.emit();
  }
}
