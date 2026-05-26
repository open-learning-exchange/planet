import { Injectable } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { EMPTY, Observable } from 'rxjs';
import { finalize, take, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DialogGuardService {
  private active = new Set<string>();

  isActive(key: string): boolean {
    return this.active.has(key);
  }

  open<T, R>(key: string, work: () => Observable<MatDialogRef<T, R>>): Observable<MatDialogRef<T, R>> {
    if (this.active.has(key)) {
      return EMPTY;
    }
    this.active.add(key);
    let opened = false;
    return work().pipe(
      take(1),
      tap(ref => {
        opened = true;
        ref.afterClosed().subscribe(() => this.active.delete(key));
      }),
      finalize(() => {
        if (!opened) {
          this.active.delete(key);
        }
      })
    );
  }
}
