import { Injectable } from "@angular/core";

import { Observable } from "rxjs/Observable";

import PouchDB from "pouchdb";
import PouchDBAuth from "pouchdb-authentication";
import { environment } from "../../../../environments/environment";
PouchDB.plugin(PouchDBAuth);

import { PouchdbService } from "./pouchdb.service";
import { catchError, flatMap, switchMap } from "rxjs/operators";
import "rxjs/add/observable/fromPromise";

@Injectable()
export class PouchdbAuthService {
  private baseUrl = environment.couchAddress;
  private authDB;

  constructor(private pouchdbService: PouchdbService) {
    this.authDB = this.pouchdbService.getRemotePouchDB("auth");
  }

  private configureStore(userId: string) {
    // instead of userID (1 database per user), we can use the user's roles and sync to the corresponding document
    this.authDB = new PouchDB(this.baseUrl + "/test", {
      skip_setup: true
    });
    this.pouchdbService.updateRemotePouchDB("auth", this.authDB);
  }

  private deconfigureStore() {
    this.authDB = "";
    this.pouchdbService.updateRemotePouchDB("auth", "");
  }

  getSessionInfo() {
    return Observable.fromPromise(this.authDB.getSession()).pipe(
      catchError(this.handleError)
    );
  }

  login(username, password) {
    // this.configureStore(username);
    return Observable.fromPromise(
      this.authDB.login(username, password).then(() => {
        this.pouchdbService.syncDb();
      })
    ).pipe(catchError(this.handleError));
  }

  signupUser(username, password, opts?) {
    this.configureStore(name);

    return Observable.fromPromise(
      this.authDB.signUp(username, password, opts)
    ).pipe(catchError(this.handleError));
  }

  private handleError(err) {
    console.error("An error occurred while signing in the user", err);
    this.deconfigureStore();
    return Observable.throw(err.message || err);
  }
}
