// src/app/services/pdf-extraction.service.ts

import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface TextItem {
  str: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExtractionService {
  constructor() {}

  async extractTextFromPdf(file: File): Promise<string> {
    const fileReader = new FileReader();

    return new Promise<string>((resolve, reject) => {
      fileReader.onload = async () => {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);

        try {
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const textPromises = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            textPromises.push(this.extractTextFromPage(pdf, i));
          }

          const pageTexts = await Promise.all(textPromises);
          resolve(pageTexts.join('\n'));
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(file);
    });
  }

  private async extractTextFromPage(pdf: any, pageIndex: number): Promise<string> {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    return content.items
      .map(item => (item as TextItem).str)
      .join(' ');
  }
}
