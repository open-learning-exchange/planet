import { Injectable } from '@angular/core';
import { ExportToCsv } from 'export-to-csv/build';

@Injectable()
export class PlanetCsvService {

  private exportToCsv;
  constructor() {
    this.exportToCsv = new ExportToCsv();
  }

  generate(data) {
    this.exportToCsv.generateCsv(data);
  }
}
