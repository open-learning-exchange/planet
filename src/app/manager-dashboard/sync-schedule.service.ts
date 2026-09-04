import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TimedSyncStatus } from '../shared/sync-schedule';

@Injectable({
  providedIn: 'root'
})
export class SyncScheduleService {

  // Timed syncs are run by the gateway, which is the only part of a planet
  // still awake when nobody has the app open.
  private readonly baseUrl = `${environment.chatAddress}${environment.production ? '/api' : ''}/sync`;

  constructor(private http: HttpClient) {}

  // Resolves to null when the gateway is unreachable or too old to serve the route.
  getStatus(): Observable<TimedSyncStatus | null> {
    return this.http.get<TimedSyncStatus>(`${this.baseUrl}/status`).pipe(catchError(() => of(null)));
  }

}
