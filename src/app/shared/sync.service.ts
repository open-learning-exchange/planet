import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from './dialogs/dialogs-form.service';
import { throwError, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private dialogsFormService: DialogsFormService
  ) {}

  openConfirmation() {
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
    .pipe(switchMap(() => {
      return of({ name: this.userService.get().name, password });
    }));
  }

  syncUp(opt, credentials) {
    return this.syncParams(opt, credentials, 'push');
  }

  syncDown(opt, credentials) {
    return this.syncParams(opt, credentials, 'pull');
  }

  private syncParams(opt, credentials, type) {
    const dbSource = opt.dbSource || opt.db;
    const dbTarget = opt.dbTarget || opt.db;
    const parentDomain = opt.parentDomain || this.userService.getConfig().parentDomain;
    const code = opt.code || this.userService.getConfig().code;
    const adminName = credentials.name + '@' + code;
    const sourceUrl = type === 'pull' ? 'https://' + parentDomain + '/' : environment.couchAddress;
    const targetUrl = type === 'pull' ? environment.couchAddress : 'https://' + parentDomain + '/';
    const replicator = {
      'source': {
        'headers': {
          'Authorization': 'Basic ' + btoa(credentials.name + ':' + credentials.password)
        },
        'url': sourceUrl + dbSource
      },
      'target': {
        'headers': {
          'Authorization': 'Basic ' + btoa(adminName + ':' + credentials.password)
        },
        'url': targetUrl + dbTarget
      },
      ...opt.options,
      'create_target':  false,
      'owner': credentials.name
    };
    return replicator;
  }

  runReplicator(params) {
    return this.couchService.post('_replicator', params);
  }

  deleteReplicator(replicators) {
    return this.couchService.put('_replicator/_bulk_docs', { docs: replicators });
  }

  fetchItems(items, dbName) {
    const itemIds = items.map((res) => {
      return { _id: res._id, _rev: res._rev };
    });
    const syncData = {
      db: dbName,
      options: { _id: dbName + '_from_parent' + Date.now(), selector: { '$or': itemIds } }
    };
    return this.openConfirmation().pipe(switchMap(credential => {
      return this.syncDown(syncData, credential);
    }));
  }

}
