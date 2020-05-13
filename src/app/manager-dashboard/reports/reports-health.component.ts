import { Component, Input, OnChanges } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { HealthService } from '../../health/health.service';
import { generateWeeksArray, itemInDateRange } from './reports.utils';
import { ReportsService } from './reports.service';
import { millisecondsToDay } from '../../meetups/constants';
import { dedupeShelfReduce } from '../../shared/utils';
import { conditions } from '../../health/health.constants';

@Component({
  selector: 'planet-reports-health',
  templateUrl: './reports-health.component.html',
  styles: [ `
    div {
      display: grid;
      margin: 0.5rem 0;
      grid-gap: 0.25rem;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
  ` ]
})
export class ReportsHealthComponent implements OnChanges {

  @Input() planetCode = this.stateService.configuration.code;
  @Input() dateRange: { startDate: Date, endDate: Date };
  examinations;
  weeklyHealthData = [];
  headlineData: { total: number, unique: string[], conditions: any };
  conditions = conditions;

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
    this.headlineData = filteredExaminations.reduce((data, examination) => ({
      ...data,
      unique: [ ...data.unique, examination.profileId ].reduce(dedupeShelfReduce, []),
      conditions: conditions.reduce(
        (conditionObj, condition) => ({
          ...conditionObj, [condition]: (conditionObj[condition] || 0) + (examination.conditions[condition] === true ? 1 : 0)
        }),
        data.conditions
      )
    }), { total: filteredExaminations.length, unique: [], conditions: {} });
  }

}
