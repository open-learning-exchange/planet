import { Injectable } from '@angular/core';
import { loadPdfMake } from './lazy-load-utils';
import { PlanetMessageService } from './planet-message.service';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(private planetMessageService: PlanetMessageService) {}

  download(documentDefinition: any, filename: string): Promise<void> {
    return loadPdfMake()
      .then(pdfMake => pdfMake.createPdf(documentDefinition).download(filename))
      .catch(() => this.planetMessageService.showAlert($localize`There was an error exporting the PDF`));
  }

}
