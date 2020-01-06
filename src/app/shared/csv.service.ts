import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { PlanetMessageService } from './planet-message.service';

@Injectable({
  providedIn: 'root'
})
export class CsvService {

  default = {
    showLabels: true,
    useKeysAsHeaders: true
  };

  constructor(
    private reportsService: ReportsService,
    private planetMessageService: PlanetMessageService
  ) {}

  private generate(data, options?) {
    if (data.length > 0) {
      new ExportToCsv({ ...this.default, ...options }).generateCsv(data);
    }
  }

  exportCSV({ data, title, headers }: { data: any[], title: string, headers?: any[] }) {
    const options = {
      title,
      filename: `Report of ${title} on ${new Date().toDateString()}`,
      showTitle: true,
      useKeysAsHeaders: !headers.length,
      headers
    };
    const formattedData = data.map(({ _id, _rev, resourceId, type, createdOn, parentCode, ...dataToDisplay }) =>
      Object.entries(dataToDisplay).reduce((object, [ key, value ]: [ string, any ]) => ({
        ...object,
        [key]: !this.isDateKey(key) ? value : value ? new Date(value).toString() : ''
      }), {}
    ));
    if (formattedData.length === 0) {
      this.planetMessageService.showAlert('There was no data during that period to export');
      return;
    }
    this.generate(formattedData, options);
  }

  exportSummaryCSV(logins: any[], resourceViews: any[], planetName: string) {
    const options = {
      title: `Summary report for ${planetName}`,
      filename: `Report of ${planetName} on ${new Date().toDateString()}`,
      showTitle: true,
      showLabels: false,
      useKeysAsHeaders: false
    };
    const groupedLogins = this.reportsService.groupLoginActivities(logins).byMonth;
    const groupedResourceViews = this.reportsService.groupResourceVisits(resourceViews).byMonth;
    const formattedData = this.summaryTable(groupedLogins, groupedResourceViews);
    this.generate(formattedData, options);
  }

  summaryTable(groupedLogins, groupedResourceViews) {
    const monthLabels = (data, header: boolean) => data.reduce(
      (csvObj, { date }) => {
        const dateLabel = this.reportsService.monthDataLabels(date);
        return { ...csvObj, [dateLabel]: header ? dateLabel : '' };
      },
      {}
    );
    const blankRow = monthLabels(groupedLogins, false);
    const headerRow = monthLabels(groupedLogins, true);
    return [
      { label: 'Unique Member Visits by Month', ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedLogins, true), headerRow),
      { label: '', ...blankRow },
      { label: 'Total Member Visits by Month', ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedLogins), headerRow),
      { label: '', ...blankRow },
      { label: 'Resource Views by Month', ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedResourceViews), headerRow)
    ];
  }

  summaryDataToTable (data, unique = false) {
    return data.reduce((table, item) => {
      const dateLabel = this.reportsService.monthDataLabels(item.date);
      const itemIndex = item.gender === 'male' ? 0 :
        item.gender === 'female' ? 1 : 2;
      const value = unique === true ? item.unique.length : item.count;
      table[itemIndex] = { ...table[itemIndex], [dateLabel]: value };
      table[3] = { ...table[3], [dateLabel]: (table[3][dateLabel] || 0) + value };
      return table;
    }, [ { label: 'Male' }, { label: 'Female' }, { label: 'Did not specify' }, { label: 'Total' } ]);
  }

  fillRows(data: any[], headerRow: any, fillValue = 0) {
    return data.map(item => {
      Object.keys(headerRow).forEach(column => {
        item = { ...item, [column]: item[column] || fillValue };
      });
      return item;
    });
  }

  isDateKey(key: string) {
    return key === 'loginTime' || key === 'time' || key === 'Date' || key === 'logoutTime';
  }

}
