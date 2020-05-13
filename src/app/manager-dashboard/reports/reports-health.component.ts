import { Component, Input, OnChanges } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { HealthService } from '../../health/health.service';
import { generateWeeksArray, itemInDateRange } from './reports.utils';
import { ReportsService } from './reports.service';
import { millisecondsToDay } from '../../meetups/constants';

@Component({
  selector: 'planet-reports-health',
  template: `
    <planet-reports-detail-activities
      [activitiesByDoc]="weeklyHealthData"
      activityType="health">
    </planet-reports-detail-activities>
  `
})
export class ReportsHealthComponent implements OnChanges {

  @Input() planetCode = this.stateService.configuration.code;
  @Input() dateRange: { startDate: Date, endDate: Date };
  examinations;
  weeklyHealthData = [];

  constructor(
    private reportsService: ReportsService,
    private stateService: StateService,
    private healthService: HealthService
  ) {}

  ngOnChanges(changes) {
    const weeks = generateWeeksArray(this.dateRange);
    if (this.planetCode && changes.planetCode && changes.planetCode.previousValue !== changes.planetCode.currentValue) {
      this.healthService.getExaminations(this.planetCode).subscribe(examinations => {
        this.examinations = examinations;
        this.setHealthData(weeks);
      });
    }
    if (this.examinations) {
      this.setHealthData(weeks);
    }
  }

  setHealthData(weeks: number[]) {
    const filteredExaminations = this.examinations.filter(
      examination => itemInDateRange(examination, 'date', this.dateRange.startDate, this.dateRange.endDate)
    );
    this.weeklyHealthData = this.reportsService.groupBy(
      filteredExaminations.map(examination => ({
        ...examination, weekOf: weeks.find(week => week > (examination.date - (millisecondsToDay * 7)))
      })),
      [ 'weekOf' ],
      { uniqueField: 'profileId', includeDocs: true }
    );
  }

}
