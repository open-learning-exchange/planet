import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';

@Injectable()
export class CsvService {

  default = {
    showLabels: true,
    useKeysAsHeaders: true
  };

  constructor() {}

  private generate(data, options?) {
    if (data.length > 0) {
      new ExportToCsv({ ...this.default, ...options }).generateCsv(data);
    }
  }

  exportCSV({ data, title }: { data: any[], title: string }) {
    const options = { title, filename: `Report of ${title} on ${new Date().toDateString()}`, showTitle: true };
    const formattedData = data.map(({ _id, _rev, resourceId, type, createdOn, parentCode, ...dataToDisplay }) => ({
      ...dataToDisplay,
      loginTime: dataToDisplay.loginTime && new Date(dataToDisplay.loginTime).toString(),
      logoutTime: dataToDisplay.loginTime && new Date(dataToDisplay.loginTime).toString(),
      time: dataToDisplay.time && new Date(dataToDisplay.time).toString()
    }));
    this.generate(formattedData, options);
  }
}
