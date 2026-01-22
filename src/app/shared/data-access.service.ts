import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { UserService } from './user.service';
import { StateService } from './state.service';
import { CouchService } from './couchdb.service';
import { DialogsLoadingService } from './dialogs/dialogs-loading.service';

@Injectable({
  providedIn: 'root'
})
export class DataAccessService {

  constructor(
    private userService: UserService,
    private stateService: StateService,
    private couchService: CouchService,
    private loadingService: DialogsLoadingService
  ) {}

  // Synchronous Helpers
  getUserData() {
    return this.userService.get();
  }

  getConfiguration() {
    return this.stateService.configuration;
  }

  getShelfData() {
    return this.userService.shelf;
  }

  getShelfObservable() {
    return this.userService.shelfChange$;
  }

  // Async Operations

  fetchShelfData(userId?: string): Observable<any> {
    const id = userId || this.getUserData()._id;
    this.loadingService.start();
    return this.couchService.get('shelf/' + id).pipe(
      catchError(error => {
        console.error('Error fetching shelf data', error);
        return throwError(error);
      }),
      finalize(() => this.loadingService.stop())
    );
  }

  saveShelfData(ids: string[], shelfName: string): Observable<any> {
    this.loadingService.start();
    return this.userService.updateShelf(ids, shelfName).pipe(
      catchError(error => {
        console.error('Error saving shelf data', error);
        return throwError(error);
      }),
      finalize(() => this.loadingService.stop())
    );
  }

  changeShelfData(ids: string[], shelfName: string, type: string): Observable<any> {
    this.loadingService.start();
    return this.userService.changeShelf(ids, shelfName, type).pipe(
      catchError(error => {
        console.error('Error changing shelf data', error);
        return throwError(error);
      }),
      finalize(() => this.loadingService.stop())
    );
  }

  initShelf(username: string): Observable<any> {
    this.loadingService.start();
    return this.couchService.put('shelf/org.couchdb.user:' + username, {}).pipe(
      catchError(error => {
        console.error('Error initializing shelf', error);
        return throwError(error);
      }),
      finalize(() => this.loadingService.stop())
    );
  }

  deleteShelf(userId: string, rev: string): Observable<any> {
    this.loadingService.start();
    return this.couchService.delete('shelf/' + userId + '?rev=' + rev).pipe(
      catchError(error => {
        console.error('Error deleting shelf', error);
        return throwError(error);
      }),
      finalize(() => this.loadingService.stop())
    );
  }
}
