import { filterByDate } from './reports.utils';

export interface ReportDetailFilter {
  app: 'planet' | 'myplanet' | '';
  startDate?: Date;
  endDate?: Date;
}

export class ReportsDetailData {

  _data: any[] = [];
  get data() {
    return this._data;
  }
  set data(newData: any[]) {
    this._data = newData;
    this.filteredData = newData;
  }
  filteredData: any[] = [];
  dateField: string;

  constructor(
    dateField: string
  ) {
    this.dateField = dateField;
  }

  filter({ app, startDate, endDate }: ReportDetailFilter) {
    const isCorrectApp = item => app === '' || ((app === 'myplanet') !== (item.androidId === undefined));
    this.filteredData = filterByDate(
      this.data,
      this.dateField,
      { startDate: startDate || new Date(0), endDate, additionalFilterFunction: (item) => isCorrectApp(item) }
    );
  }

}
