import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ExportToCsv } from 'export-to-csv/build';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Papa from 'papaparse';
import { environment } from '../../environments/environment';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { PlanetMessageService } from './planet-message.service';
import { markdownToPlainText } from './utils';
import { monthDataLabels } from '../manager-dashboard/reports/reports.utils';

@Injectable({
  providedIn: 'root'
})
export class CsvService {

  default = {
    showLabels: true,
    useKeysAsHeaders: true
  };

  constructor(
    private http: HttpClient,
    private reportsService: ReportsService,
    private planetMessageService: PlanetMessageService
  ) {}

  private generate(data, options?) {
    if (data.length > 0) {
      new ExportToCsv({ ...this.default, ...options }).generateCsv(data);
    }
  }

  exportCSV({ data, title }: { data: any[], title: string }) {
    const options = { title, filename: $localize`Report of ${title} on ${new Date().toDateString()}`, showTitle: true };
    const formattedData = data.map(({ _id, _rev, resourceId, type, createdOn, parentCode, data: d, hasInfo, ...dataToDisplay }) => {
      return Object.entries(dataToDisplay).reduce(
        (object, [ key, value ]: [ string, any ]) => ({ ...object, [markdownToPlainText(key)]: this.formatValue(key, value) }),
        {}
      );
    });
    if (formattedData.length === 0) {
      this.planetMessageService.showAlert($localize`There was no data during that period to export`);
      return;
    }
    this.generate(formattedData, options);
  }

  exportSummaryCSV(logins: any[], resourceViews: any[], courseViews: any[], stepCompletions: any[], planetName: string) {
    const options = {
      title: $localize`Summary report for ${planetName}`,
      filename: $localize`Report of ${planetName} on ${new Date().toDateString()}`,
      showTitle: true,
      showLabels: false,
      useKeysAsHeaders: false
    };
    const groupedLogins = this.reportsService.groupLoginActivities(logins).byMonth;
    const groupedResourceViews = this.reportsService.groupDocVisits(resourceViews, 'resourceId').byMonth;
    const groupedCourseViews = this.reportsService.groupDocVisits(courseViews, 'courseId').byMonth;
    const groupedStepCompletions = this.reportsService.groupStepCompletion(stepCompletions).byMonth;
    const formattedData = this.summaryTable(groupedLogins, groupedResourceViews, groupedCourseViews, groupedStepCompletions);
    this.generate(formattedData, options);
  }

  summaryTable(groupedLogins, groupedResourceViews, groupedCourseViews, groupedStepCompletions) {
    const monthLabels = (data, header: boolean) => data.reduce(
      (csvObj, { date }) => {
        const dateLabel = monthDataLabels(date);
        return { ...csvObj, [dateLabel]: header ? dateLabel : '' };
      },
      {}
    );
    const blankRow = monthLabels(groupedLogins, false);
    const headerRow = monthLabels(groupedLogins, true);
    return [
      { label: $localize`Unique Member Visits by Month`, ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedLogins, true), headerRow),
      { label: '', ...blankRow },
      { label: $localize`Total Member Visits by Month`, ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedLogins), headerRow),
      { label: '', ...blankRow },
      { label: $localize`Resource Views by Month`, ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedResourceViews), headerRow),
      { label: '', ...blankRow },
      { label: $localize`Course Views by Month`, ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedCourseViews), headerRow),
      { label: '', ...blankRow },
      { label: $localize`Steps Completed by Month`, ...headerRow },
      ...this.fillRows(this.summaryDataToTable(groupedStepCompletions), headerRow)
    ];
  }

  summaryDataToTable (data, unique = false) {
    return data.reduce((table, item) => {
      const dateLabel = monthDataLabels(item.date);
      const itemIndex = item.gender === 'male' ? 0 :
        item.gender === 'female' ? 1 : 2;
      const value = unique === true ? item.unique.length : item.count;
      table[itemIndex] = { ...table[itemIndex], [dateLabel]: value };
      table[3] = { ...table[3], [dateLabel]: (table[3][dateLabel] || 0) + value };
      return table;
    }, [ { label: $localize`Male` }, { label: $localize`Female` }, { label: $localize`Did not specify` }, { label: $localize`Total` } ]);
  }

  fillRows(data: any[], headerRow: any, fillValue = 0) {
    return data.map(item => {
      Object.keys(headerRow).forEach(column => {
        item = { ...item, [column]: item[column] || fillValue };
      });
      return item;
    });
  }

  formatValue(key: string, value: any) {
    const dateString = (date: number | undefined) => date ? new Date(date).toString() : '';
    return key === 'conditions' ?
      this.formatHealthConditions(value) :
      this.isDateKey(key) ?
      dateString(value) :
      markdownToPlainText(value);
  }

  isDateKey(key: string) {
    const dateKeys = [ 'loginTime', 'time', 'Date', 'logoutTime', 'date', 'Start Date', 'End Date', 'Created Date', 'Updated Date' ];
    return dateKeys.indexOf(key) > -1;
  }

  formatHealthConditions(conditions: any) {
    return Object.entries(conditions).filter(([ key, value ]) => value === true).map(([ key, value ]) => key).join(', ');
  }

  loadCSVSheet(docId: string, attachmentId: string): Observable<{ headers: string[], rows: any[][] }> {
    const url = `${environment.couchAddress}/resources/${docId}/${attachmentId}`;
    return this.http.get(url, { responseType: 'text', withCredentials: true }).pipe(
      map((data: string) => {
        const rawData = Papa.parse(data, { header: false, skipEmptyLines: true }).data as any[][];
        const maxCols = rawData.reduce((max, row) => Math.max(max, row.length), 0);
        let headers: string[] = [];
        let rows: any[][] = [];

        if (rawData.length > 0 && rawData[0].length === maxCols) {
          headers = rawData[0];
          rows = rawData.slice(1);
        } else {
          headers = Array.from({ length: maxCols }, (_, i) => `Col ${i + 1}`);
          rows = rawData;
        }
        return { headers, rows };
      })
    );
  }

}
