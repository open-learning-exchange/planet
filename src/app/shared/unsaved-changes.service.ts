import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesService {
  private hasUnsavedChangesSubject = new BehaviorSubject<boolean>(false);

  setHasUnsavedChanges(hasUnsavedChanges: boolean): void {
    console.log('setHasUnsavedChanges called with:', hasUnsavedChanges); // Add logging
    console.trace(); // Add stack trace logging
    this.hasUnsavedChangesSubject.next(hasUnsavedChanges);
  }

  getHasUnsavedChanges(): Observable<boolean> {
    return this.hasUnsavedChangesSubject.asObservable();
  }
}