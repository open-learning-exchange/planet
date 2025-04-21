import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';
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

  exportSummaryCSV(logins: any[], resourceViews: any[], courseViews: any[], stepCompletions: any[], 
    planetName: string, chatActivities: any[] = []) {
    const options = {
      title: $localize`Summary report for ${planetName}`,
      filename: $localize`Report of ${planetName} on ${new Date().toDateString()}`,
      showTitle: true,
      showLabels: true,
      useKeysAsHeaders: true
    };
    const groupedLogins = this.reportsService.groupLoginActivities(logins).byMonth;
    const groupedResourceViews = this.reportsService.groupDocVisits(resourceViews, 'resourceId').byMonth;
    const groupedCourseViews = this.reportsService.groupDocVisits(courseViews, 'courseId').byMonth;
    const groupedStepCompletions = this.reportsService.groupStepCompletion(stepCompletions).byMonth;
    const groupedChatData = chatActivities.length > 0 && this.reportsService.groupChatUsage ? 
      this.reportsService.groupChatUsage(chatActivities).byMonth : [];
    const allMonths = new Set<string>();
    [...groupedLogins, ...groupedResourceViews, ...groupedCourseViews, ...groupedStepCompletions, ...groupedChatData]
      .forEach(item => allMonths.add(item.date));
    const sortedMonths = Array.from(allMonths).sort();
    const monthLabels = sortedMonths.map(month => monthDataLabels(month));
    const formattedData = [];
    formattedData.push({ Section: $localize`Unique Member Visits by Month`, All: '', Male: '', Female: '', Unspecified: '' });
    for (let i = 0; i < sortedMonths.length; i++) {
      const month = sortedMonths[i];
      const monthLabel = monthLabels[i];
      formattedData.push({
        Section: '',
        Month: monthLabel,
        All: this.getMonthlyData(month, groupedLogins, true),
        Male: this.getMonthlyData(month, groupedLogins.filter(item => item.gender === 'male'), true),
        Female: this.getMonthlyData(month, groupedLogins.filter(item => item.gender === 'female'), true),
        Unspecified: this.getMonthlyData(month, groupedLogins.filter(item => item.gender === undefined), true)
      });
    }
    formattedData.push({ Section: '', Month: '', All: '', Male: '', Female: '', Unspecified: '' });
    formattedData.push({ Section: $localize`Total Member Visits by Month`, All: '', Male: '', Female: '', Unspecified: '' });
    
    for (let i = 0; i < sortedMonths.length; i++) {
      const month = sortedMonths[i];
      const monthLabel = monthLabels[i];
      formattedData.push({
        Section: '',
        Month: monthLabel,
        All: this.getMonthlyData(month, groupedLogins, false),
        Male: this.getMonthlyData(month, groupedLogins.filter(item => item.gender === 'male'), false),
        Female: this.getMonthlyData(month, groupedLogins.filter(item => item.gender === 'female'), false),
        Unspecified: this.getMonthlyData(month, groupedLogins.filter(item => item.gender === undefined), false)
      });
    }
    formattedData.push({ Section: '', Month: '', All: '', Male: '', Female: '', Unspecified: '' });
    formattedData.push({ Section: $localize`Resource Views by Month`, All: '', Male: '', Female: '', Unspecified: '' });
    for (let i = 0; i < sortedMonths.length; i++) {
      const month = sortedMonths[i];
      const monthLabel = monthLabels[i];
      formattedData.push({
        Section: '',
        Month: monthLabel,
        All: this.getMonthlyData(month, groupedResourceViews, false),
        Male: this.getMonthlyData(month, groupedResourceViews.filter(item => item.gender === 'male'), false),
        Female: this.getMonthlyData(month, groupedResourceViews.filter(item => item.gender === 'female'), false),
        Unspecified: this.getMonthlyData(month, groupedResourceViews.filter(item => item.gender === undefined), false)
      });
    }
    formattedData.push({ Section: '', Month: '', All: '', Male: '', Female: '', Unspecified: '' });
    formattedData.push({ Section: $localize`Course Views by Month`, All: '', Male: '', Female: '', Unspecified: '' });
    for (let i = 0; i < sortedMonths.length; i++) {
      const month = sortedMonths[i];
      const monthLabel = monthLabels[i];
      formattedData.push({
        Section: '',
        Month: monthLabel,
        All: this.getMonthlyData(month, groupedCourseViews, false),
        Male: this.getMonthlyData(month, groupedCourseViews.filter(item => item.gender === 'male'), false),
        Female: this.getMonthlyData(month, groupedCourseViews.filter(item => item.gender === 'female'), false),
        Unspecified: this.getMonthlyData(month, groupedCourseViews.filter(item => item.gender === undefined), false)
      });
    }
    formattedData.push({ Section: '', Month: '', All: '', Male: '', Female: '', Unspecified: '' });
    formattedData.push({ Section: $localize`Steps Completed by Month`, All: '', Male: '', Female: '', Unspecified: '' });
    for (let i = 0; i < sortedMonths.length; i++) {
      const month = sortedMonths[i];
      const monthLabel = monthLabels[i];
      formattedData.push({
        Section: '',
        Month: monthLabel,
        All: this.getMonthlyData(month, groupedStepCompletions, false),
        Male: this.getMonthlyData(month, groupedStepCompletions.filter(item => item.gender === 'male'), false),
        Female: this.getMonthlyData(month, groupedStepCompletions.filter(item => item.gender === 'female'), false),
        Unspecified: this.getMonthlyData(month, groupedStepCompletions.filter(item => item.gender === undefined), false)
      });
    }
    formattedData.push({ Section: '', Month: '', All: '', Male: '', Female: '', Unspecified: '' });
    formattedData.push({ Section: $localize`Chats Created by Month`, All: '', Male: '', Female: '', Unspecified: '' });
    for (let i = 0; i < sortedMonths.length; i++) {
      const month = sortedMonths[i];
      const monthLabel = monthLabels[i];
      formattedData.push({
        Section: '',
        Month: monthLabel,
        All: this.getMonthlyData(month, groupedChatData, false),
        Male: this.getMonthlyData(month, groupedChatData.filter(item => item.gender === 'male'), false),
        Female: this.getMonthlyData(month, groupedChatData.filter(item => item.gender === 'female'), false),
        Unspecified: this.getMonthlyData(month, groupedChatData.filter(item => item.gender === undefined), false)
      });
    }
    this.generate(formattedData, options);
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
    } else {
      return monthData.reduce((total, item) => total + (item.count || 0), 0);
    }
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

}
