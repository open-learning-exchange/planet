import { Injectable } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { defer, EMPTY, Observable } from 'rxjs';
import { filter, finalize, take, tap } from 'rxjs/operators';
import { DialogsLoadingService } from './dialogs-loading.service';

@Injectable({ providedIn: 'root' })
export class DialogGuardService {
  private active = new Set<string>();

  constructor(private dialogsLoadingService: DialogsLoadingService) {}

  isActive(key: string): boolean {
    return this.active.has(key);
  }

  open<T, R>(
    key: string, work: () => Observable<MatDialogRef<T, R>>, { cover = true } = {}
  ): Observable<MatDialogRef<T, R>> {
    if (this.active.has(key)) {
      return EMPTY;
    }
    this.active.add(key);
    let opened = false;
    return new Observable<MatDialogRef<T, R>>(subscriber => {
      let settled = false;
      let covering = false;
      let trigger: HTMLElement | undefined;
      const subscription = defer(work).pipe(
        filter(ref => !!ref),
        take(1),
        tap(ref => {
          opened = true;
          ref.afterClosed().subscribe(() => {
            this.active.delete(key);
            // The dialog opened while the overlay held focus, so its own focus restore targets the removed overlay
            if (trigger && document.activeElement === document.body) {
              trigger.focus();
            }
          });
        }),
        finalize(() => {
          settled = true;
          if (covering) {
            this.dialogsLoadingService.stop();
          }
          if (!opened) {
            this.active.delete(key);
          }
        })
      ).subscribe(subscriber);
      // Work that settles during subscribe opened its dialog synchronously, so covering it would only flash the overlay
      if (cover && !settled) {
        covering = true;
        trigger = document.activeElement as HTMLElement;
        this.dialogsLoadingService.start();
      }
      return subscription;
    });
  }

  // For flows whose dialog opens inside a service, such as SyncService's password confirmation: the key is held until the flow ends
  run<T>(key: string, work: () => Observable<T>): Observable<T> {
    return defer(() => {
      if (this.active.has(key)) {
        return EMPTY;
      }
      this.active.add(key);
      return defer(work).pipe(finalize(() => this.active.delete(key)));
    });
  }
}
