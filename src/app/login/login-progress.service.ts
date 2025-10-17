import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type LoginProgressState = 'idle' | 'authenticating' | 'syncing' | 'navigating' | 'finalizing' | 'complete';

@Injectable({ providedIn: 'root' })
export class LoginProgressService {
  private readonly state$ = new BehaviorSubject<LoginProgressState>('idle');

  get progress$(): Observable<LoginProgressState> {
    return this.state$.asObservable();
  }

  setState(state: LoginProgressState) {
    this.state$.next(state);
  }

  reset() {
    this.state$.next('idle');
  }
}
