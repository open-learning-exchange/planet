import { Injectable } from '@angular/core';
import { PlanetMessageService } from './planet-message.service';

let pdfMakePromise: Promise<any> | null = null;
let htmlToPdfmakePromise: Promise<any> | null = null;

function loadPdfMake(): Promise<any> {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]).then(([ pdfMakeModule, pdfFontsModule ]) => {
      const pdfMake = pdfMakeModule.default;
      pdfMake.addVirtualFileSystem(pdfFontsModule.default);
      return pdfMake;
    }).catch((error) => {
      pdfMakePromise = null;
      throw error;
    });
  }
  return pdfMakePromise;
}

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

  getHtmlConverter(): Promise<(html: string) => any> {
    if (!htmlToPdfmakePromise) {
      htmlToPdfmakePromise = import('html-to-pdfmake').then(module => module.default).catch((error) => {
        htmlToPdfmakePromise = null;
        throw error;
      });
    }
    return htmlToPdfmakePromise;
  }

}
