import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() {
    pdfMake.addVirtualFileSystem(pdfFonts);
  }

  download(documentDefinition: any, filename: string) {
    pdfMake.createPdf(documentDefinition).download(filename);
  }

}
