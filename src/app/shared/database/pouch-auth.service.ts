import { Injectable, Inject } from '@angular/core';
import { from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PouchService } from './pouch.service';

@Injectable()
export class PouchAuthService {
    private authDB;

    constructor(private pouchService: PouchService) {
        this.authDB = this.pouchService.getAuthDB();
    }

    login(username, password) {
        return from(this.authDB.login(username, password)).pipe(
            catchError(this.handleError)
        );
    }

    // opts: for passing in extra data about the user
    signup(username, password, opts?) {
        return from(this.authDB.signUp(username, password, opts)).pipe(
            catchError(this.handleError)
        );
    }

    private handleError(err) {
        console.error('An error occured while signing in the user', err);
        return throwError(err.message || err);
    }
}
