import { forkJoin, Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { PendingAttachment } from '../shared/forms/file-upload.component';
import { normalizedContentType, safeAttachmentName } from '../shared/utils';

export const FEEDBACK_MAX_IMAGES = 3;
export const FEEDBACK_MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const FEEDBACK_IMAGE_TYPES = [ 'image/png', 'image/jpeg', 'image/gif', 'image/webp' ];

export interface FeedbackImageAttachment {
  content_type: string;
  data: string;
}

// Inline attachments keep the initial feedback and its screenshots in a single document write.
export const prepareFeedbackAttachments = (
  images: PendingAttachment[] = []
): Observable<Record<string, FeedbackImageAttachment>> => {
  if (images.length > FEEDBACK_MAX_IMAGES || images.some(({ file }) =>
    !file || file.size === 0 || file.size > FEEDBACK_MAX_IMAGE_SIZE ||
    !FEEDBACK_IMAGE_TYPES.includes(normalizedContentType(file).toLowerCase())
  )) {
    return throwError(new Error($localize`Choose up to three PNG, JPEG, GIF or WebP images, no larger than 2 MB each.`));
  }
  if (!images.length) {
    return of({});
  }
  const names: string[] = [];
  return forkJoin(images.map(({ file }) => {
    const name = safeAttachmentName(`screenshot-${file.name}`, names);
    names.push(name);
    return new Observable<FeedbackImageAttachment>(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        observer.next({
          content_type: normalizedContentType(file).toLowerCase(),
          data: (reader.result as string).split(',')[1]
        });
        observer.complete();
      };
      reader.onerror = () => observer.error(new Error($localize`Could not read an image. Please select it again.`));
      reader.readAsDataURL(file);
      return () => {
        if (reader.readyState === FileReader.LOADING) {
          reader.abort();
        }
      };
    }).pipe(map(attachment => ({ name, attachment })));
  })).pipe(map(attachments => Object.fromEntries(attachments.map(({ name, attachment }) => [ name, attachment ]))));
};
