import { AppSourceFilter, isFromAppSource } from '../../shared/app-source';
import { filterByDate, isSelectedMember } from './reports.utils';

export interface ReportDetailFilter {
  app: AppSourceFilter;
  members: any;
  startDate?: Date;
  endDate?: Date;
}

export class ReportsDetailData {

  #data: any[] = [];
  get data() {
    return this.#data;
  }
  set data(newData: any[]) {
    this.#data = newData;
    this.filteredData = newData;
  }
  filteredData: any[] = [];
  dateField: string;

  constructor(
    dateField: string
  ) {
    this.dateField = dateField;
  }

  /*
   * Returns a filtered view without touching `filteredData`, so a caller wanting a different window
   * (the week-over-week comparison, say) can slice the full dataset instead of re-filtering the
   * already narrowed `filteredData` and silently intersecting the two ranges.
   */
  slice({ app, members, startDate, endDate }: ReportDetailFilter) {
    return filterByDate(
      this.data,
      this.dateField,
      {
        startDate: startDate || new Date(0),
        endDate,
        additionalFilterFunction: (item) => isFromAppSource(item, app) && isSelectedMember(item, members)
      }
    );
  }

  filter(reportFilter: ReportDetailFilter) {
    this.filteredData = this.slice(reportFilter);
  }

}
