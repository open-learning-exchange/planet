import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { MarkdownRenderService } from '@shared/markdown/markdown-render.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { normalizeMarkdownWhitespace } from '@shared/utils';
import { environment } from '../../../environments/environment';

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

const loadHtmlToPdfmake = (): Promise<(html: string, options: object) => any> => {
  if (!htmlToPdfmakePromise) {
    htmlToPdfmakePromise = import('html-to-pdfmake').then(module => module.default).catch((error) => {
      htmlToPdfmakePromise = null;
      throw error;
    });
  }
  return htmlToPdfmakePromise;
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

const findNodes = (node: any, matches: (node: any) => boolean): any[] => {
  if (Array.isArray(node)) {
    return node.flatMap(child => findNodes(child, matches));
  }
  if (!node || typeof node !== 'object') {
    return [];
  }
  return [ ...(matches(node) ? [ node ] : []), ...Object.values(node).flatMap(child => findNodes(child, matches)) ];
};

// The markdown renderer puts these classes on aligned table cells, and the survey export on its questions and responses
const markdownAlignStyles = {
  'markdown-align-left': { alignment: 'left' },
  'markdown-align-center': { alignment: 'center' },
  'markdown-align-right': { alignment: 'right' }
};

const htmlToPdfmakeOptions = {
  // Roboto has no ☑/☐ task-list glyphs
  replaceText: (text: string) => text.replace(/☑/g, '[x]').replace(/☐/g, '[ ]'),
  customTag: ({ element, ret }) => {
    // The renderer removes unsafe image URLs, and pdfmake fails the whole PDF on an image without one
    if (element.nodeName === 'IMG' && !ret.image) {
      return { text: '' };
    }
    // The newlines between block tags end up as blank stack entries (blank lines); between inline tags they're real spaces
    if (Array.isArray(ret.stack)) {
      ret.stack = ret.stack.filter(child => typeof child.text !== 'string' || child.text.trim());
    }
    return ret;
  }
};

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(
    private planetMessageService: PlanetMessageService,
    private couchService: CouchService,
    private markdownRenderer: MarkdownRenderService
  ) {}

  download(documentDefinition: any, filename: string): Promise<void> {
    return Promise.all([ loadPdfMake(), this.convertHtml(documentDefinition).then(converted => this.embedLinkedImages(converted)) ])
      .then(([ pdfMake, definition ]) => pdfMake.createPdf(definition).download(filename))
      .catch(() => this.planetMessageService.showAlert($localize`There was an error exporting the PDF`));
  }

  // { markdown } and { html } aren't pdfmake nodes: builders use them for rich fields, and they become pdfmake content only here
  private convertHtml(documentDefinition: any): Promise<any> {
    const nodes = findNodes(documentDefinition.content, node => typeof node.markdown === 'string' || typeof node.html === 'string');
    if (nodes.length === 0) {
      return Promise.resolve(documentDefinition);
    }
    return loadHtmlToPdfmake().then(htmlToPdfmake => {
      nodes.forEach(node => {
        const safeHtml = typeof node.markdown === 'string' ?
          this.markdownRenderer.render(normalizeMarkdownWhitespace(node.markdown), `${environment.couchAddress}/`) :
          this.markdownRenderer.sanitizeHtml(node.html);
        node.stack = htmlToPdfmake(safeHtml, htmlToPdfmakeOptions);
        delete node.markdown;
        delete node.html;
      });
      return { ...documentDefinition, styles: { ...markdownAlignStyles, ...documentDefinition.styles } };
    });
  }

  // pdfmake only embeds data URLs: each linked image is fetched once and keyed by URL, and one that fails to load is left out
  private embedLinkedImages(documentDefinition: any): Promise<any> {
    const nodes = findNodes(documentDefinition.content, node =>
      typeof node.image === 'string' && !node.image.startsWith('data:') && !documentDefinition.images?.[node.image]
    );
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

}
