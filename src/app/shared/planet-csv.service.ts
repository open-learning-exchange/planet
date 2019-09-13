import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';

@Injectable()
export class PlanetCsvService {

  default = {
    showLabels: true,
    useKeysAsHeaders: true
  };

  constructor() {}

  generate(data, options?) {
    if (data.length > 0) {
      new ExportToCsv({ ...this.default, ...options }).generateCsv(data);
    }
  }
}
