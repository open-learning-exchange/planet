import { filterByDate, filterByMember, isSelectedMember } from './reports.utils';
import { ActivityDateField } from './reports.constants';

export interface ReportDetailFilter {
  app: 'planet' | 'myplanet' | '';
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
  dateField: ActivityDateField;

  constructor(
    dateField: ActivityDateField
  ) {
    this.dateField = dateField;
  }

  // The date field is a property of the data, so callers ask the data for a range rather than
  // naming the field themselves.
  inRange(dateRange: { startDate: Date, endDate: Date }, members: any[] = []) {
    return filterByMember(filterByDate(this.data, this.dateField, dateRange), members);
  }

  filteredInRange(dateRange: { startDate: Date, endDate: Date }) {
    return filterByDate(this.filteredData, this.dateField, dateRange);
  }

  filter({ app, members, startDate, endDate }: ReportDetailFilter) {
    const isCorrectApp = item => (app === '' || ((app === 'myplanet') !== (item.androidId === undefined)));
    this.filteredData = filterByDate(
      this.data,
      this.dateField,
      {
        startDate: startDate || new Date(0),
        endDate,
        additionalFilterFunction: (item) => isCorrectApp(item) && isSelectedMember(item, members)
      }
    );
  }

}
