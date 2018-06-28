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

    getSessionInfo() {
        return from(this.authDB.getSession()).pipe(
            catchError(this.handleError)
        );
    }

    login(username, password) {
        return from(this.authDB.login(username, password)).pipe(
            catchError(this.handleError)
        );
    }

    signup(username, password, metadata?) {
        return from(this.authDB.signUp(username, password, { metadata })).pipe(
            catchError(this.handleError)
        );
    }

    private handleError(err) {
        console.error('An error occured while signing in the user', err);
        return throwError(err.message || err);
    }
}
