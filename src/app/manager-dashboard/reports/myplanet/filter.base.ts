import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ReportsService } from '../reports.service';

export abstract class MyPlanetFiltersBase {

  private readonly defaultTimeFilter: string;
  selectedVersion = '';
  selectedTimeFilter: string;
  showCustomDateFields = false;
  timeFilterOptions: any[] = this.activityService.standardTimeFilters;
  minDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  today: Date = new Date();
  startDate: Date = this.minDate;
  endDate: Date = this.today;
  filtersForm: FormGroup<{ startDate: FormControl<Date>; endDate: FormControl<Date>; }>;
  get isDefaultTimeFilter(): boolean {
    return this.selectedTimeFilter === this.defaultTimeFilter;
  }

  protected constructor(
    protected fb: FormBuilder,
    protected activityService: ReportsService,
    defaultTimeFilter: string,
  ) {
    this.defaultTimeFilter = defaultTimeFilter;
    this.selectedTimeFilter = defaultTimeFilter;

    this.filtersForm = this.fb.group({
      startDate: this.fb.control(this.minDate, {
        nonNullable: true,
        validators: [ Validators.required, Validators.min(this.minDate.getTime()), Validators.max(this.today.getTime()) ]
      }),
      endDate: this.fb.control(this.today, {
        nonNullable: true,
        validators: [ Validators.required, Validators.min(this.minDate.getTime()), Validators.max(this.today.getTime()) ]
      })
    }, {
      validators: (ac) => {
        const { startDate, endDate } = ac.value;
        return startDate > endDate ? { invalidDates: true } : null;
      }
    });

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
      return;
    }
    this.startDate = startDate;
    this.endDate = endDate;
    this.filtersForm.patchValue({
      startDate,
      endDate
    });
    this.applyFilters();
  }

  clearFilters() {
    this.selectedVersion = '';
    this.resetDateFilter();
    this.applyFilters();
  }

  abstract applyFilters(): void;
}

