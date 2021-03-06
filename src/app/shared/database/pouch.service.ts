import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import PouchDBFind from 'pouchdb-find';
import { throwError, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

PouchDB.plugin(PouchDBAuth);
PouchDB.plugin(PouchDBFind);

@Injectable({
  providedIn: 'root'
})
export class PouchService {
  private baseUrl = environment.couchAddress + '/';
  private localDBs = new Map<string, PouchDB.Database>();
  private authDB: PouchDB.Database;
  private databases = new Set<string>([ 'feedback' ]);

  constructor() {
    // test is a placeholder temp databases
    // we need a central remote database
    // since we will have different levels of authentication (manager, intersn)
    // we will have to create corresponding documents in couchdb and we can sync
    // we can decide that when the user is being created for the first time?
    this.authDB = new PouchDB(this.baseUrl + 'test', {
      fetch(url, opts) {
        opts.credentials = 'include';
        return (PouchDB as any).fetch(url, opts);
      }
    } as PouchDB.Configuration.RemoteDatabaseConfiguration);

    this.configureDBs();
  }

  configureDBs() {
    this.databases.forEach(db => {
      this.localDBs.set(db, new PouchDB(`local-${db}`));
    });
  }

  deconfigureDBs() {
    return Array.from(this.localDBs.values(), pouchDB => pouchDB.destroy());
  }

  // @TODO: handle edge cases like offline, duplicate, duplications
  // handle repliction errors or make use of navigator online?
  replicateFromRemoteDBs() {
    return Array.from(this.localDBs.entries(), ([ dbName, pouchDB ]) => this.replicate(dbName, pouchDB, 'from'));
  }

  replicateToRemoteDBs() {
    return Array.from(this.localDBs.entries(), ([ dbName, pouchDB ]) => this.replicate(dbName, pouchDB, 'to'));
  }

  replicate(dbName: string, pouchDB: PouchDB.Database, direction: 'from' | 'to') {
    const replicateFn = direction === 'from' ? pouchDB.replicate.from(this.baseUrl + dbName) : pouchDB.replicate.to(this.baseUrl + dbName);
    return from(replicateFn).pipe(catchError(this.handleError));
  }

  getLocalPouchDB(db: string): PouchDB.Database {
    return this.localDBs.get(db);
  }

  getAuthDB(): PouchDB.Database {
    return this.authDB;
  }

  private handleError(err) {
    console.error('An error occurred in PouchDB', err);
    return throwError(err.message || err);
  }

  private docEditingDB(db, id) {
    const name = `${db}_${id}`;
    return this.localDBs.get(name) !== undefined ? this.localDBs.get(name) : new PouchDB(name);
  }

  getDocEditing(db, id = 'new') {
    return from(this.docEditingDB(db, id).allDocs({ include_docs: true }))
      .pipe(map((res: any) => {
        const row = res.rows.find((r: any) => r.id === id);
        return row && row.doc;
      }));
  }

  saveDocEditing(doc, db, id = 'new') {
    this.getDocEditing(db, id).subscribe((oldDoc: any) => {
      this.docEditingDB(db, id).put({ ...doc, '_id': id, '_rev': oldDoc && oldDoc._rev });
    });
  }

  deleteDocEditing(db, id = 'new') {
    this.docEditingDB(db, id).destroy();
  }

}
