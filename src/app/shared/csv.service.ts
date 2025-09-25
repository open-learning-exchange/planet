import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { PlanetMessageService } from './planet-message.service';
import { markdownToPlainText, formatDate } from './utils';
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

  exportSummaryCSV(
    logins: any[], resourceViews: any[], courseViews: any[], stepCompletions: any[],
    chatActivities: any[], voicesActivities: any[], planetName: string, startDate: Date, endDate: Date
  ) {
    const options = {
      title: $localize`Summary report for ${planetName}\n${formatDate(startDate)} - ${formatDate(endDate)}`,
      filename: $localize`Report of ${planetName} on ${new Date().toDateString()}`,
      showTitle: true,
      showLabels: true,
      useKeysAsHeaders: true
    };
    const groupedLogins = this.reportsService.groupLoginActivities(logins).byMonth;
    const groupedResourceViews = this.reportsService.groupDocVisits(resourceViews, 'resourceId').byMonth;
    const groupedCourseViews = this.reportsService.groupDocVisits(courseViews, 'courseId').byMonth;
    const groupedStepCompletions = this.reportsService.groupStepCompletion(stepCompletions).byMonth;
    const groupedChatData = this.reportsService.groupChatUsage(chatActivities).byMonth;
    const groupedVoicesData = this.reportsService.groupVoicesCreated(voicesActivities).byMonth;
    const formattedData = this.buildSummaryTable([
      { title: $localize`Unique Member Visits`, data: groupedLogins, countUnique: true },
      { title: $localize`Total Member Visits`, data: groupedLogins, countUnique: false },
      { title: $localize`Resource Views`, data: groupedResourceViews, countUnique: false },
      { title: $localize`Course Views@@course-views-multiple`, data: groupedCourseViews, countUnique: false },
      { title: $localize`Steps Completed`, data: groupedStepCompletions, countUnique: false },
      { title: $localize`Chats Created`, data: groupedChatData, countUnique: false },
      { title: $localize`Voices Created`, data: groupedVoicesData, countUnique: false }
    ]);
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
    }
    return monthData.reduce((total, item) => total + (item.count || 0), 0);
  }

  private buildSummaryTable(sections: Array<{ title: string; data: any[]; countUnique: boolean }>): any[] {
    const allMonths = new Set<string>();
    sections.forEach(section => {
      section.data.forEach(item => allMonths.add(item.date));
    });
    const sortedMonths = Array.from(allMonths).sort();
    const monthLabels = sortedMonths.map(month => monthDataLabels(month));
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

}
