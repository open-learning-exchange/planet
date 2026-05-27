import { Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeviceInfoService, DeviceType } from '../../../shared/device-info.service';
import { MyPlanetFiltersForm } from './filter.base';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { NgIf, NgTemplateOutlet, NgFor } from '@angular/common';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatFormField, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';

@Component({
  selector: 'planet-myplanet-toolbar',
  templateUrl: './myplanet-toolbar.component.html',
  styleUrls: ['./myplanet.scss'],
  imports: [
    MatToolbar, NgIf, MatToolbarRow, NgTemplateOutlet, MatIconButton, MatIcon, RouterLink, MatFormField, MatLabel,
    MatSelect, MatOption, NgFor, FormsModule, ReactiveFormsModule, MatInput, MatDatepickerInput, MatDatepickerToggle,
    MatSuffix, MatDatepicker, MatError, MatButton
  ]
})
export class MyPlanetToolbarComponent {
  private readonly destroyRef = inject(DestroyRef);

  @Input() title = '';
  @Input() versions: string[] = [];
  @Input() selectedVersion = '';
  @Input() types: string[] = [];
  @Input() selectedType = '';
  @Input() showTypeFilter = false;
  @Input() timeFilterOptions: { label: string; value: string }[] = [];
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
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  showFiltersRow = false;

  constructor(private deviceInfoService: DeviceInfoService) {
    this.deviceInfoService.watchDeviceType()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deviceType) => {
        this.deviceType = deviceType;
      });
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

  onResetDateFilter() {
    this.resetDateFilter.emit();
  }
}
