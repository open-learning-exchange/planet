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
    const allData = [ ...logins, ...resourceViews, ...courseViews, ...stepCompletions, ...chatActivities ];
    const startDate = allData.length > 0 ?
      new Date(Math.min(...allData.map(item => new Date(item.loginTime || item.time || item.createdDate).getTime()))) :
      new Date();
    const endDate = allData.length > 0 ?
      new Date(Math.max(...allData.map(item => new Date(item.loginTime || item.time || item.createdDate).getTime()))) :
      new Date();
    const formatDate = (date) => {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).replace(',', '');
    };
    const options = {
      title: $localize`Summary report for ${planetName}\n${formatDate(startDate)} to ${formatDate(endDate)}`,
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
    [ ...groupedLogins, ...groupedResourceViews, ...groupedCourseViews, ...groupedStepCompletions, ...groupedChatData ]
      .forEach(item => allMonths.add(item.date));
    const sortedMonths = Array.from(allMonths).sort();
    const monthLabels = sortedMonths.map(month => monthDataLabels(month));
    const formattedData = [];
    const processSection = (title: string, groupedData: any[], countUnique: boolean) => {
      formattedData.push({ Section: $localize`${title}`, Month: '', All: '', Male: '', Female: '', Unspecified: '' });
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
        formattedData.push({
          Section: '',
          Month: monthLabel,
          All: all,
          Male: male,
          Female: female,
          Unspecified: unspecified
        });
      });
      formattedData.push({
        Section: '',
        Month: $localize`Total`,
        All: totalAll,
        Male: totalMale,
        Female: totalFemale,
        Unspecified: totalUnspecified
      });
    };
    processSection('Unique Member Visits', groupedLogins, true);
    processSection('Total Member Visits', groupedLogins, false);
    processSection('Resource Views', groupedResourceViews, false);
    processSection('Course Views', groupedCourseViews, false);
    processSection('Steps Completed', groupedStepCompletions, false);
    processSection('Chats Created', groupedChatData, false);
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
