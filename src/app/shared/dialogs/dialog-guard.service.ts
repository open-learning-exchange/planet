import { Injectable } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { EMPTY, Observable } from 'rxjs';
import { finalize, take, tap } from 'rxjs/operators';

/*
 * Keeps a key busy from the moment a dialog is requested until the dialog it opened closes, so
 * repeated clicks cannot start duplicate requests or stack duplicate dialogs.  Keys are chosen by
 * the caller, which keeps unrelated prompts independent of each other.
 */
@Injectable({ providedIn: 'root' })
export class DialogGuardService {
  private active = new Map<string, MatDialogRef<any, any> | null>();

  isActive(key: string): boolean {
    return this.active.has(key);
  }

  activeRef<T, R>(key: string): MatDialogRef<T, R> | null {
    return this.active.get(key) || null;
  }

  // For dialogs opened immediately.  Returns the dialog already open for the key on a duplicate call.
  openNow<T, R>(key: string, work: () => MatDialogRef<T, R>): MatDialogRef<T, R> | null {
    if (this.active.has(key)) {
      return this.activeRef<T, R>(key);
    }
    this.active.set(key, null);
    let ref: MatDialogRef<T, R>;
    try {
      ref = work();
    } catch (error) {
      this.active.delete(key);
      throw error;
    }
    if (!ref) {
      this.active.delete(key);
      return null;
    }
    this.track(key, ref);
    return ref;
  }

  // For dialogs opened after asynchronous work.  Emits nothing on a duplicate call.
  open<T, R>(key: string, work: () => Observable<MatDialogRef<T, R>>): Observable<MatDialogRef<T, R>> {
    if (this.active.has(key)) {
      return EMPTY;
    }
    this.active.set(key, null);
    let opened = false;
    return work().pipe(
      take(1),
      tap(ref => {
        if (!ref) {
          return;
        }
        opened = true;
        this.track(key, ref);
      }),
      finalize(() => {
        if (!opened) {
          this.active.delete(key);
        }
      })
    );
  }

  private track<T, R>(key: string, ref: MatDialogRef<T, R>) {
    this.active.set(key, ref);
    ref.afterClosed().pipe(take(1)).subscribe(() => this.active.delete(key));
  }
}
