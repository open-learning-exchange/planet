import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from './dialogs/dialogs-form.service';
import { throwError, forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { debug } from '../debug-operator';

const passwordFormFields = [
  {
    'label': 'Password',
    'type': 'textbox',
    'inputType': 'password',
    'name': 'password',
    'placeholder': 'Password',
    'required': true
  }
];

@Injectable()
export class SyncService {

  private parentDomain: string;
  private code: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private dialogsFormService: DialogsFormService
  ) {}

  confirmPasswordAndRunReplicators(replicators) {
    return this.openConfirmation().pipe(switchMap((credentials) => {
      return forkJoin(replicators.map((replicator) => this.sync(replicator, credentials)));
    }));
  }

  sync(replicator, credentials) {
    this.parentDomain = this.userService.getConfig().parentDomain || replicator.parentDomain;
    this.code = this.userService.getConfig().code || replicator.code;
    return this.couchService.post('_replicator', this.syncParams(replicator, credentials, replicator.type));
  }

  deleteReplicators(replicators) {
    return this.couchService.post('_replicator/_bulk_docs', { docs: replicators });
  }

  private openConfirmation() {
    const title = 'Admin Confirmation';
    const formGroup = {
      password: [ '', Validators.required ]
    };
    return this.dialogsFormService
    .confirm(title, passwordFormFields, formGroup)
    .pipe(
      debug('Dialog confirm'),
      switchMap((response: any) => {
        if (response !== undefined) {
          return this.verifyPassword(response.password);
        }
        return throwError('Invalid password');
      })
    );
  }

  private verifyPassword(password) {
    return this.couchService.post('_session', { name: this.userService.get().name, password })
    .pipe(map(() => {
      return { name: this.userService.get().name, password };
    }));
  }

  private syncParams(replicator, credentials, type) {
    const dbSource = replicator.dbSource || replicator.db;
    const dbTarget = replicator.dbTarget || replicator.db;
    if (replicator.items) {
      replicator.selector = this.itemSelector(replicator.items);
    }
    return {
      // Name the id always after the local database
      '_id': (type === 'push' ? dbSource : dbTarget) + '_' + type + (replicator.date ? '_' + Date.now() : ''),
      'source': this.dbObj(dbSource, credentials, type === 'pull'),
      'target': this.dbObj(dbTarget, credentials, type !== 'pull'),
      'selector': replicator.selector,
      'create_target':  false,
      'owner': credentials.name
    };
  }

  private itemSelector(items) {
    return { '$or': items.map((res) => ({ _id: res._id, _rev: res._rev })) };
  }

  private dbObj(dbName, credentials, parent: boolean) {
    const username = credentials.name + (parent ? '@' + this.code : '');
    const domain = parent ? this.parentDomain + '/' : environment.couchAddress;
    const protocol = parent ? environment.centerProtocol + '://' : '';
    return {
      'headers': {
        'Authorization': 'Basic ' + btoa(username + ':' + credentials.password)
      },
      'url': protocol + domain + dbName
    };
  }

}
