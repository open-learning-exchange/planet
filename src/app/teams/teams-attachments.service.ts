import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { AttachmentInputState, ExistingAttachment, PendingAttachment } from '../shared/forms/file-upload.component';

export interface TeamsAttachmentUploadResult {
  latestRev: string;
  failedAttachments: string[];
}

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

  uploadReceiptImages(
    docId: string,
    startingRev: string,
    state: AttachmentInputState,
    includeRetained = true
  ): Observable<TeamsAttachmentUploadResult> {
    const attachments = [
      ...(includeRetained ? state.retained : []),
      ...state.added
    ];
    return attachments.reduce((request$, attachment) => request$.pipe(
      switchMap(result => this.uploadReceiptImage(docId, result.latestRev, attachment).pipe(
        map((response: any) => ({ ...result, latestRev: response.rev })),
        catchError(() => of({
          ...result,
          failedAttachments: [ ...result.failedAttachments, this.attachmentName(attachment) ]
        }))
      ))
    ), of({ latestRev: startingRev, failedAttachments: [] }));
  }

  private uploadReceiptImage(docId: string, rev: string, attachment: ExistingAttachment | PendingAttachment) {
    return this.receiptFile(attachment).pipe(switchMap(({ file, name, contentType }) =>
      this.couchService.putAttachment(`teams/${docId}/${encodeURIComponent(name)}?rev=${rev}`, file, {
        headers: { 'Content-Type': contentType }
      })
    ));
  }

  private receiptFile(attachment: ExistingAttachment | PendingAttachment) {
    if ('file' in attachment) {
      return of({ file: attachment.file, name: attachment.safeName, contentType: attachment.contentType || attachment.file.type });
    }
    if (!attachment.url) {
      return throwError(() => new Error('Existing attachment is missing a URL'));
    }
    return this.couchService.getAttachment(attachment.url).pipe(map((blob) => ({
      file: new File([ blob ], attachment.name, { type: attachment.contentType || blob.type }),
      name: attachment.name,
      contentType: attachment.contentType || blob.type
    })));
  }

  private attachmentName(attachment: ExistingAttachment | PendingAttachment) {
    return 'file' in attachment ? attachment.safeName : attachment.name;
  }

  private isReceiptImage(attachment: any) {
    return this.receiptImageTypes.includes((attachment?.content_type || '').toLowerCase());
  }

}
