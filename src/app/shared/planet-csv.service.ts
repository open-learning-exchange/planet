import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';

@Injectable()
export class PlanetCsvService {

  default = {
    showLabels: true,
    useKeysAsHeaders: true
  };
  private exportToCsv;
  constructor() { }

  generate(data, options?) {
    this.exportToCsv = new ExportToCsv({ ...this.default, ...options });
    this.exportToCsv.generateCsv(data);
  }
}
