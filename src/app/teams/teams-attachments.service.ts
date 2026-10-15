import { Injectable } from '@angular/core';
import { defer, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { AttachmentInputState, ExistingAttachment } from '@shared/forms/file-upload.component';
import { normalizeImage, withImageAttachments } from '@shared/utils';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamsAttachmentsService {

  readonly maxReceiptImages = 2;
  readonly receiptImageAccept = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
  readonly receiptImageHint = $localize`JPG, PNG or WEBP attached images`;
  readonly receiptImagePills = [ 'JPG', 'PNG', 'WEBP' ];
  private readonly receiptImageTypes = [ 'image/jpeg', 'image/png', 'image/webp' ];

  constructor(private couchService: CouchService) {}

  emptyAttachmentState(): AttachmentInputState {
    return { retained: [], removed: [], added: [] };
  }

  attachmentStateForDoc(doc: any): AttachmentInputState {
    return { ...this.emptyAttachmentState(), retained: this.receiptAttachments(doc) };
  }

  receiptAttachments(doc: any): ExistingAttachment[] {
    return (Object.entries(doc?._attachments || {}) as [ string, any ][])
      .filter(([ , attachment ]) => this.isReceiptImage(attachment))
      .sort(([ a ], [ b ]) => a.localeCompare(b))
      .map(([ name, attachment ]) => ({
        contentType: attachment.content_type,
        name,
        size: attachment.length,
        url: `${environment.couchAddress}/teams/${doc._id}/${encodeURIComponent(name)}`
      }));
  }

  receiptAttachmentImages(doc: any): Observable<Array<{ image: string, name: string }>> {
    const attachments = this.receiptAttachments(doc);
    if (attachments.length === 0) {
      return of([]);
    }
    return forkJoin(attachments.map(attachment =>
      this.couchService.getAttachment(attachment.url).pipe(
        switchMap(blob => this.receiptBlobToPdfDataUrl(blob, attachment.contentType)),
        map(image => ({ image, name: attachment.name })),
        catchError(() => of(null))
      )
    )).pipe(map(images => images.filter((image): image is { image: string, name: string } => !!image)));
  }

  retainSelectedAttachments(doc: any, state: AttachmentInputState) {
    const retainedNames = new Set(state.retained.map(attachment => attachment.name));
    const attachments = Object.entries(doc?._attachments || {}).reduce((result, [ name, attachment ]: [ string, any ]) => {
      if (!this.isReceiptImage(attachment) || retainedNames.has(name)) {
        result[name] = attachment;
      }
      return result;
    }, {});
    return attachments;
  }

  // 1920px keeps printed text on receipts readable
  withReceiptImages(doc: any, state: AttachmentInputState) {
    return defer(() => withImageAttachments(
      doc, { added: state.added }, (file, usedNames) => normalizeImage(file, { maxDimension: 1920, usedNames })
    ));
  }

  private blobToDataUrl(blob: Blob): Observable<string> {
    return new Observable(observer => {
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
  }

  private receiptBlobToPdfDataUrl(blob: Blob, contentType?: string): Observable<string> {
    return (contentType || blob.type).toLowerCase() === 'image/webp' ?
      this.webpBlobToJpegDataUrl(blob) :
      this.blobToDataUrl(blob);
  }

  // pdfmake can't embed WebP. JPEG keeps photos small where PNG bloats them; it has no transparency, hence the white fill
  private webpBlobToJpegDataUrl(blob: Blob): Observable<string> {
    return new Observable(observer => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        URL.revokeObjectURL(url);
        if (!context) {
          observer.error(new Error('Unable to convert WebP receipt image'));
          return;
        }
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        observer.next(canvas.toDataURL('image/jpeg', 0.85));
        observer.complete();
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        observer.error(new Error('Unable to load WebP receipt image'));
      };
      image.src = url;
      return () => {
        URL.revokeObjectURL(url);
        image.src = '';
      };
    });
  }

  private isReceiptImage(attachment: any) {
    return this.receiptImageTypes.includes((attachment?.content_type || '').toLowerCase());
  }

}
