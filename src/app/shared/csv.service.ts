import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';

@Injectable({
  providedIn: 'root'
})
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
    const formattedData = data.map(({ _id, _rev, resourceId, type, createdOn, parentCode, ...dataToDisplay }) =>
      Object.entries(dataToDisplay).reduce((object, [ key, value ]: [ string, any ]) => ({
        ...object,
        [key]: key.toLowerCase().indexOf('time') === -1 ? value : value ? new Date(value).toString() : ''
      }), {}
    ));
    this.generate(formattedData, options);
  }
}
