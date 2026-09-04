import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { formatDate as formatLocaleDate } from '@angular/common';
import { Router } from '@angular/router';
import { ExportToCsv } from 'export-to-csv/build';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { PlanetMessageService } from './planet-message.service';
import { CouchService } from './couchdb.service';
import { couchAttachmentPath, markdownToPlainText, formatDate } from './utils';
import { monthDataLabels } from '../manager-dashboard/reports/reports.utils';

export const CSV_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_PREVIEW_MAX_ROWS = 5000;
export const CSV_PREVIEW_STORAGE_PREFIX = 'planet-csv-preview-';
export const CSV_PREVIEW_STORAGE_MAX_BYTES = 4 * 1024 * 1024;
export const CSV_PREVIEW_STORAGE_TTL = 10 * 60 * 1000;
export const CSV_PREVIEW_ROUTE = '/manager/reports/csv-preview';

export interface CsvPreview {
  columns: string[];
  rows: Array<Record<string, string>>;
  truncated: boolean;
}

export interface CsvPreviewTable extends CsvPreview {
  title: string;
  createdOn: number;
}

export const csvColumnsOf = (rows: any[]): string[] => {
  const columns: string[] = [];
  rows.forEach(row => Object.keys(row).forEach(column => {
    if (columns.indexOf(column) === -1) {
      columns.push(column);
    }
  }));
  return columns;
};

// A preview tab is opened while the user's click is still fresh, then filled in once the report rows
// are built, which can require a round trip for team membership. Opening it later trips pop-up blockers.
export class CsvPreviewSession {

  constructor(
    private storageKey: string,
    private target: Window | null,
    private onError: (message: string) => void
  ) {}

  get isOpen(): boolean {
    return !!this.target && !this.target.closed;
  }

  publish(rows: any[], title: string) {
    if (!this.target) {
      return;
    }
    if (!rows.length) {
      this.cancel($localize`There was no data during that period to export`);
      return;
    }
    const table: CsvPreviewTable = {
      title,
      columns: csvColumnsOf(rows),
      rows: rows.slice(0, CSV_PREVIEW_MAX_ROWS),
      truncated: rows.length > CSV_PREVIEW_MAX_ROWS,
      createdOn: Date.now()
    };
    const serialized = JSON.stringify(table);
    if (serialized.length > CSV_PREVIEW_STORAGE_MAX_BYTES) {
      this.cancel($localize`This report is too large to preview. Download it instead.`);
      return;
    }
    try {
      window.localStorage.setItem(this.storageKey, serialized);
    } catch {
      this.cancel($localize`Unable to preview this report. Download it instead.`);
    }
  }

  cancel(message?: string) {
    this.discard();
    if (message) {
      this.onError(message);
    }
  }

  private discard() {
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {}
    this.target?.close();
    this.target = null;
  }

}

@Injectable({
  providedIn: 'root'
})
export class CsvService {

  default = {
    showLabels: true,
    useKeysAsHeaders: true
  };

  constructor(
    private couchService: CouchService,
    private reportsService: ReportsService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    @Inject(LOCALE_ID) private localeId: string
  ) {}

  private generate(data, options?) {
    if (data.length > 0) {
      new ExportToCsv({ ...this.default, ...options }).generateCsv(data);
    }
  }

  exportCSV({ data, title }: { data: any[], title: string }) {
    this.exportFormattedCSV({ data: this.formatExportRows(data), title });
  }

  // Strips the fields that are never exported and renders each remaining value as CSV text. The rows
  // this returns are what both the download and the preview show, so the two always agree.
  formatExportRows(data: any[]): any[] {
    return (data || []).map(
      ({ _id, _rev, resourceId, type, createdOn, parentCode, data: d, hasInfo, ...dataToDisplay }) => (
        Object.entries(dataToDisplay).reduce(
          (object, [ key, value ]: [ string, any ]) => ({ ...object, [markdownToPlainText(key)]: this.formatValue(key, value) }),
          {}
        )
      )
    );
  }

  exportFormattedCSV({ data, title }: { data: any[], title: string }) {
    if (data.length === 0) {
      this.planetMessageService.showAlert($localize`There was no data during that period to export`);
      return;
    }
    const reportDate = formatLocaleDate(new Date(), 'mediumDate', this.localeId);
    this.generate(data, { title, filename: $localize`Report of ${title} on ${reportDate}`, showTitle: true });
  }

  // Opens the preview tab now so it keeps the user gesture that triggered it, then the caller fills it
  // in with `publish` once the rows are ready.
  openPreviewWindow(): CsvPreviewSession {
    this.purgeStalePreviews();
    const storageKey = `${CSV_PREVIEW_STORAGE_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const target = window.open(this.previewUrl(storageKey), '_blank');
    if (!target) {
      this.planetMessageService.showAlert($localize`Allow pop-ups for this site to preview reports`);
    }
    return new CsvPreviewSession(storageKey, target, message => this.planetMessageService.showAlert(message));
  }

  private previewUrl(storageKey: string): string {
    const path = this.router.serializeUrl(this.router.createUrlTree([ CSV_PREVIEW_ROUTE ], { queryParams: { key: storageKey } }));
    return new URL(path.replace(/^\//, ''), document.baseURI).href;
  }

  private purgeStalePreviews() {
    try {
      Object.keys(window.localStorage)
        .filter(key => key.startsWith(CSV_PREVIEW_STORAGE_PREFIX))
        .forEach(key => {
          const createdOn = JSON.parse(window.localStorage.getItem(key) || '{}')?.createdOn;
          if (!createdOn || Date.now() - createdOn > CSV_PREVIEW_STORAGE_TTL) {
            window.localStorage.removeItem(key);
          }
        });
    } catch {}
  }

  exportSummaryCSV(
    logins: any[], resourceViews: any[], courseViews: any[], stepCompletions: any[],
    chatActivities: any[], voicesActivities: any[], planetName: string, startDate: Date, endDate: Date
  ) {
    const options = {
      title: $localize`Summary report for ${planetName}\n${formatDate(startDate)} - ${formatDate(endDate)}`,
      filename: $localize`Report of ${planetName} on ${formatLocaleDate(new Date(), 'mediumDate', this.localeId)}`,
      showTitle: true,
      showLabels: true,
      useKeysAsHeaders: true
    };
    this.generate(this.summaryRows(logins, resourceViews, courseViews, stepCompletions, chatActivities, voicesActivities), options);
  }

  summaryRows(
    logins: any[], resourceViews: any[], courseViews: any[], stepCompletions: any[],
    chatActivities: any[], voicesActivities: any[]
  ): any[] {
    const groupedLogins = this.reportsService.groupLoginActivities(logins).byMonth;
    const groupedResourceViews = this.reportsService.groupDocVisits(resourceViews, 'resourceId').byMonth;
    const groupedCourseViews = this.reportsService.groupDocVisits(courseViews, 'courseId').byMonth;
    const groupedStepCompletions = this.reportsService.groupStepCompletion(stepCompletions).byMonth;
    const groupedChatData = this.reportsService.groupChatUsage(chatActivities).byMonth;
    const groupedVoicesData = this.reportsService.groupVoicesCreated(voicesActivities).byMonth;
    return this.buildSummaryTable([
      { title: $localize`Unique Member Visits`, data: groupedLogins, countUnique: true },
      { title: $localize`Total Member Visits`, data: groupedLogins, countUnique: false },
      { title: $localize`Resource Views`, data: groupedResourceViews, countUnique: false },
      { title: $localize`Course Views`, data: groupedCourseViews, countUnique: false },
      { title: $localize`Steps Completed`, data: groupedStepCompletions, countUnique: false },
      { title: $localize`Chats Created`, data: groupedChatData, countUnique: false },
      { title: $localize`Voices Created`, data: groupedVoicesData, countUnique: false }
    ]);
  }

  private getMonthlyData(month: string, data: any[], countUnique: boolean): number {
    const monthData = data.filter(item => item.date === month);
    if (countUnique && monthData.length > 0) {
      const uniqueUsers = new Set();
      monthData.forEach(item => {
        if (item.unique && item.unique.length) {
          item.unique.forEach(user => uniqueUsers.add(user));
        }
      });
      return uniqueUsers.size;
    }
    return monthData.reduce((total, item) => total + (item.count || 0), 0);
  }

  private buildSummaryTable(sections: Array<{ title: string; data: any[]; countUnique: boolean }>): any[] {
    const allMonths = new Set<string>();
    sections.forEach(section => {
      section.data.forEach(item => allMonths.add(item.date));
    });
    const sortedMonths = Array.from(allMonths).sort();
    const monthLabels = sortedMonths.map(month => monthDataLabels(month, this.localeId));
    const formattedData = [];

    sections.forEach(section => {
      this.processSection(formattedData, section.title, section.data, section.countUnique, sortedMonths, monthLabels);
    });

    return formattedData;
  }

  private processSection(
    formattedData: any[], title: string, groupedData: any[], countUnique: boolean, sortedMonths: string[], monthLabels: string[]
  ): void {
    const pushRow = (section, month, all, male, female, unspecified) => {
      formattedData.push({
        [$localize`Section`]: section,
        [$localize`Month`]: month,
        [$localize`All`]: all,
        [$localize`Male`]: male,
        [$localize`Female`]: female,
        [$localize`Unspecified`]: unspecified
      });
    };

    pushRow(title, '', '', '', '', '');
    let totalAll = 0;
    let totalMale = 0;
    let totalFemale = 0;
    let totalUnspecified = 0;

    sortedMonths.forEach((month, i) => {
      const monthLabel = monthLabels[i];
      const all = this.getMonthlyData(month, groupedData, countUnique);
      const male = this.getMonthlyData(month, groupedData.filter(item => item.gender === 'male'), countUnique);
      const female = this.getMonthlyData(month, groupedData.filter(item => item.gender === 'female'), countUnique);
      const unspecified = this.getMonthlyData(month, groupedData.filter(item => item.gender === undefined), countUnique);

      totalAll += all;
      totalMale += male;
      totalFemale += female;
      totalUnspecified += unspecified;
      pushRow('', monthLabel, all, male, female, unspecified);
    });

    pushRow('', $localize`Total`, totalAll, totalMale, totalFemale, totalUnspecified);
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

  loadCsvAttachment(docId: string, attachmentId: string, domain?: string): Observable<CsvPreview> {
    // papaparse is only needed when previewing a CSV resource, so load it in its own chunk on demand
    return forkJoin([
      this.couchService.get(
        `resources/${couchAttachmentPath(docId, attachmentId)}`,
        { responseType: 'text', domain }
      ),
      import('papaparse')
    ]).pipe(
      map(([ csvText, papa ]) => this.parseCsv(papa, csvText))
    );
  }

  private parseCsv(papa: typeof import('papaparse'), csvText: string): CsvPreview {
    const data: string[][] = [];
    let headerIndex = 0;
    let wideHeaderFound = false;
    let truncated = false;
    papa.parse<string[]>(csvText, {
      skipEmptyLines: true,
      step: ({ data: row }, parser) => {
        data.push(row);
        if (!wideHeaderFound && row.length > 1) {
          headerIndex = data.length - 1;
          wideHeaderFound = true;
        }
        if (data.length > headerIndex + 1 + CSV_PREVIEW_MAX_ROWS) {
          truncated = true;
          parser.abort();
        }
      }
    });
    if (data.length === 0) {
      return { columns: [], rows: [], truncated: false };
    }
    const previewData = data.slice(0, headerIndex + 1 + CSV_PREVIEW_MAX_ROWS);
    const widestRowLength = previewData.reduce((max, row) => Math.max(max, row.length), 0);
    const headerRow = Array.from({ length: widestRowLength }, (_, index) => data[headerIndex][index] ?? '');
    const columns = this.uniqueColumnNames(headerRow);
    const rows = previewData.slice(headerIndex + 1).map(row =>
      Object.fromEntries(columns.map((column, index) => [ column, row[index] ?? '' ]))
    );
    return { columns, rows, truncated };
  }

  private uniqueColumnNames(headerRow: string[]): string[] {
    const nameCounts = new Map<string, number>();
    const usedNames = new Set<string>();
    return headerRow.map((header, index) => {
      const name = (header || '').trim() || $localize`Column ${index + 1}`;
      let count = (nameCounts.get(name) || 0) + 1;
      let columnName = count > 1 ? `${name} (${count})` : name;
      while (usedNames.has(columnName)) {
        count++;
        columnName = `${name} (${count})`;
      }
      nameCounts.set(name, count);
      usedNames.add(columnName);
      return columnName;
    });
  }

}
