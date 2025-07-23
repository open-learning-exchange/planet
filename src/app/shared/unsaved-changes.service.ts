import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesService {
  static readonly warningMsg = $localize`You have unsaved changes. Are you sure you want to leave?`;
  private unsavedChanges = false;

  setHasUnsavedChanges(hasChanges: boolean) {
    this.unsavedChanges = hasChanges;
  }

  getHasUnsavedChanges(): boolean {
    return this.unsavedChanges;
  }
}
