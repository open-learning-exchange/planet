import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { DeviceInfoService, DeviceType } from '../../../shared/device-info.service';

@Component({
  selector: 'planet-myplanet-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./shared.scss']
})
export class MyPlanetToolbarComponent {

  @Input() title = '';
  @Input() versions: string[] = [];
  @Input() selectedVersion = '';
  @Input() types: string[] = [];
  @Input() selectedType = '';
  @Input() showTypeFilter = false;
  @Input() timeFilterOptions: { label: string; value: string }[] = [];
  @Input() selectedTimeFilter = '';
  @Input() formGroup!: UntypedFormGroup;
  @Input() showCustomDateFields = false;
  @Input() minDate!: Date;
  @Input() today!: Date;
  @Input() searchValue = '';
  @Input() disableShowAllTime = true;
  @Output() versionChange = new EventEmitter<string>();
  @Output() typeChange = new EventEmitter<string>();
  @Output() timeFilterChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();
  @Output() resetDateFilter = new EventEmitter<void>();
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  showFiltersRow = false;

  constructor(private deviceInfoService: DeviceInfoService) {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1350 });
  }

  @HostListener('window:resize')
  OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1350 });
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
    this.search.emit(value);
  }

  onClear() {
    this.clear.emit();
  }

  onResetDateFilter() {
    this.resetDateFilter.emit();
  }
}
