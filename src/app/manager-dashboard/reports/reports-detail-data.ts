import { filterByDate, isSelectedMember } from './reports.utils';

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
  dateField: string;

  constructor(
    dateField: string
  ) {
    this.dateField = dateField;
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
