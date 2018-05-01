import { Injectable } from "@angular/core";
import PouchDB from "pouchdb";
import { environment } from "../../../../environments/environment";

type RemoteDatabases = "auth";

@Injectable()
export class PouchdbService {
  private baseUrl = environment.couchAddress;
  private localDb;
  private remoteDbs = {
    auth: null
  };

  constructor() {
    this.localDb = new PouchDB("local-pouchdb");

    this.remoteDbs.auth = new PouchDB(this.baseUrl + "/notifications", {
      skip_setup: true
    });

    // Object.keys(this.remoteDbs).forEach(key => {
    //   this.remoteDbs[key] = new PouchDB()
    // })
  }

  syncDb() {
    this.localDb
      .sync(this.remoteDbs.auth, { live: true, retry: true })
      .on("error", console.log.bind(console));
  }

  getLocalPouchDB() {
    return this.localDb;
  }

  getRemotePouchDB(key: RemoteDatabases) {
    return this.remoteDbs[key];
  }

  updateRemotePouchDB(key: RemoteDatabases, updatedDatabase) {
    this.remoteDbs[key] = updatedDatabase;
  }
}
