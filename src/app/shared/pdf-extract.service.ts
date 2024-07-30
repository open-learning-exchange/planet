// src/app/services/pdf-extraction.service.ts

import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Define the TextItem type based on the structure of the text content items
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
          let text = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map(item => {
                const textItem = item as TextItem;
                return textItem.str;
              })
              .join(' ');
            text += pageText + '\n';
          }

          resolve(text);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(file);
    });
  }
}
