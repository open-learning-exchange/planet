import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class CustomMatPaginatorIntl extends MatPaginatorIntl {

  constructor() {
    super();

    this.itemsPerPageLabel = $localize`Items per page`;
    this.nextPageLabel = $localize`Next page`;
    this.previousPageLabel = $localize`Previous page`;
    this.firstPageLabel = $localize`First page`;
    this.lastPageLabel = $localize`Last page`;

    // Trigger change detection when labels are updated
    this.changes.next();
  }

  // Custom range label function with translation support
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) { return $localize`0 of ${length}`; }

    const startIndex = page * pageSize;
    const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;

    return $localize`${startIndex + 1} – ${endIndex} of ${length}`;
  };
}
