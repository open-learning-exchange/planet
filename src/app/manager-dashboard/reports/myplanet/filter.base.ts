import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ReportsService } from '../reports.service';

export interface MyPlanetFiltersForm {
  startDate: FormControl<Date>;
  endDate: FormControl<Date>;
}

export abstract class MyPlanetFiltersBase {

  private readonly defaultTimeFilter: string;
  selectedVersion = '';
  selectedTimeFilter: string;
  searchValue = '';
  showCustomDateFields = false;
  isEmpty = false;
  isLoading = false;
  versions: string[] = [];
  showFiltersRow = false;
  timeFilterOptions: any[] = this.activityService.standardTimeFilters;
  minDate: Date = new Date();
  today: Date = new Date();
  startDate: Date = this.minDate;
  endDate: Date = this.today;
  filtersForm: FormGroup<MyPlanetFiltersForm>;
  get isDefaultTimeFilter(): boolean {
    return this.selectedTimeFilter === this.defaultTimeFilter;
  }

  protected constructor(
    protected fb: NonNullableFormBuilder,
    protected activityService: ReportsService,
    defaultTimeFilter: string
  ) {
    this.defaultTimeFilter = defaultTimeFilter;
    this.selectedTimeFilter = defaultTimeFilter;

    this.filtersForm = this.fb.group({ startDate: this.minDate, endDate: this.today }, {
      validators: (group) => {
        const fg = group as FormGroup<MyPlanetFiltersForm>;
        const startDate = fg.controls.startDate.value;
        const endDate = fg.controls.endDate.value;
        return startDate > endDate ? { invalidDates: true } : null;
      }
    });
    this.updateFormValidators();
    this.filtersForm.valueChanges.subscribe(({ startDate, endDate }) => {
      this.startDate = startDate;
      this.endDate = endDate;
      if (!this.filtersForm.errors?.invalidDates) {
        this.applyFilters();
      }
    });
  }

  resetDateFilter() {
    this.onTimeFilterChange(this.defaultTimeFilter);
  }

  onTimeFilterChange(timeFilter: string) {
    this.selectedTimeFilter = timeFilter;
    const { startDate, endDate, showCustomDateFields } = this.activityService.getDateRange(timeFilter, this.minDate);
    this.showCustomDateFields = showCustomDateFields;
    if (timeFilter === 'custom') {
      this.filtersForm.patchValue({ startDate: this.startDate, endDate: this.endDate }, { emitEvent: false });
      return;
    }
    this.startDate = startDate;
    this.endDate = endDate;
    this.filtersForm.patchValue({ startDate, endDate }, { emitEvent: false });
    this.applyFilters();
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.applyFilters();
  }

  onVersionChange(version: string) {
    this.selectedVersion = version;
    this.applyFilters();
  }

  clearFilters() {
    this.selectedVersion = '';
    this.searchValue = '';
    this.resetDateFilter();
    this.applyFilters();
  }

  protected updateMinDate(newMinDate: Date) {
    this.minDate = newMinDate;
    this.updateFormValidators();
    this.onTimeFilterChange(this.selectedTimeFilter);
  }

  private updateFormValidators() {
    const { startDate, endDate } = this.filtersForm.controls;

    startDate.setValidators(
      [ Validators.required, Validators.min(this.minDate.getTime()), Validators.max(this.today.getTime()) ]
    );
    endDate.setValidators(
      [ Validators.required, Validators.min(this.minDate.getTime()), Validators.max(this.today.getTime()) ]
    );
    this.filtersForm.updateValueAndValidity();
  }

  abstract applyFilters(): void;
}
