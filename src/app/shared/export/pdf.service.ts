import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';

let pdfMakePromise: Promise<any> | null = null;
let htmlToPdfmakePromise: Promise<any> | null = null;

const loadPdfMake = (): Promise<any> => {
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
};

const blobToDataUrl = (blob: Blob): Observable<string> => new Observable(observer => {
  const reader = new FileReader();
  reader.onload = () => {
    observer.next(reader.result as string);
    observer.complete();
  };
  reader.onerror = () => observer.error(reader.error);
  reader.readAsDataURL(blob);
  return () => {
    if (reader.readyState === FileReader.LOADING) {
      reader.abort();
    }
  };
});

// JPEG keeps photos small where PNG bloats them; it has no transparency, hence the white fill
const blobToJpegDataUrl = (blob: Blob): Observable<string> => new Observable(observer => {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    URL.revokeObjectURL(url);
    if (!context) {
      observer.error(new Error('Unable to convert image'));
      return;
    }
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    // An empty (0×0) or oversized canvas encodes as 'data:,', which pdfmake can't parse
    if (dataUrl === 'data:,') {
      observer.error(new Error('Unable to convert image'));
      return;
    }
    observer.next(dataUrl);
    observer.complete();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    observer.error(new Error('Unable to load image'));
  };
  image.src = url;
  return () => {
    URL.revokeObjectURL(url);
    image.src = '';
  };
});

// pdfmake can only embed JPEG and PNG
export const imageBlobToPdfDataUrl = (blob: Blob, contentType = blob.type): Observable<string> =>
  [ 'image/jpeg', 'image/png' ].includes(contentType.toLowerCase()) ? blobToDataUrl(blob) : blobToJpegDataUrl(blob);

const linkedImageNodes = (node: any, images: Record<string, string> = {}): any[] => {
  if (Array.isArray(node)) {
    return node.flatMap(child => linkedImageNodes(child, images));
  }
  if (!node || typeof node !== 'object') {
    return [];
  }
  const isLinked = typeof node.image === 'string' && !node.image.startsWith('data:') && !images[node.image];
  return [ ...(isLinked ? [ node ] : []), ...Object.values(node).flatMap(child => linkedImageNodes(child, images)) ];
};

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(
    private planetMessageService: PlanetMessageService,
    private couchService: CouchService
  ) {}

  download(documentDefinition: any, filename: string): Promise<void> {
    return Promise.all([ loadPdfMake(), this.embedLinkedImages(documentDefinition) ])
      .then(([ pdfMake, definition ]) => pdfMake.createPdf(definition).download(filename))
      .catch(() => this.planetMessageService.showAlert($localize`There was an error exporting the PDF`));
  }

  // pdfmake only embeds data URLs: each linked image is fetched once and keyed by URL, and one that fails to load is left out
  private embedLinkedImages(documentDefinition: any): Promise<any> {
    const nodes = linkedImageNodes(documentDefinition.content, documentDefinition.images);
    if (nodes.length === 0) {
      return Promise.resolve(documentDefinition);
    }
    const urls: string[] = [ ...new Set<string>(nodes.map(node => node.image)) ];
    return forkJoin(urls.map(url => this.couchService.getAttachment(url).pipe(
      switchMap(blob => imageBlobToPdfDataUrl(blob)),
      catchError(() => of(''))
    ))).pipe(map(dataUrls => {
      const images = urls.reduce((result, url, index) => dataUrls[index] ? { ...result, [url]: dataUrls[index] } : result, {});
      nodes.forEach(node => {
        if (!images[node.image]) {
          delete node.image;
          node.text = '';
        } else if (!node.fit && !node.width) {
          node.fit = [ 400, 400 ];
        }
      });
      return { ...documentDefinition, images: { ...documentDefinition.images, ...images } };
    })).toPromise();
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
