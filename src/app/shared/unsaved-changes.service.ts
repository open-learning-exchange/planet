import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesService {
  private unsavedChanges = false;

  setHasUnsavedChanges(hasChanges: boolean) {
    this.unsavedChanges = hasChanges;
  }

  getHasUnsavedChanges(): boolean {
    return this.unsavedChanges;
  }
}
