import { Injectable } from '@angular/core';
import { dedupeObjectArray } from './utils';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {

  createImagesArray(formValue, markdown, field: 'message' | 'description') {
    return dedupeObjectArray([
      ...(formValue.images || []),
      ...(formValue[field].images || [])
    ], [ 'resourceId' ]);
  }

  filterMissingImages(markdowns: string[], images: any[]) {
    return images.filter(image => markdowns.some(markdown => markdown.indexOf(image.resourceId) > -1));
  }

}
