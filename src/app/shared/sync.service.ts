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

  private sync(replicator, credentials) {
    return this.couchService.post('_replicator', this.syncParams(replicator, credentials, replicator.type));
  }

  private syncParams(replicator, credentials, type) {
    const dbSource = replicator.dbSource || replicator.db;
    const dbTarget = replicator.dbTarget || replicator.db;
    if (replicator.items) {
      replicator.selector = this.itemSelector(replicator.items);
    }
    return {
      '_id': dbSource + '_' + type,
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
    const username = credentials.name + (parent ? '@' + this.userService.getConfig().code : '');
    const domain = parent ? this.userService.getConfig().parentDomain + '/' : environment.couchAddress;
    const protocol = parent ? environment.centerProtocol + '://' : '';
    return {
      'headers': {
        'Authorization': 'Basic ' + btoa(username + ':' + credentials.password)
      },
      'url': protocol + domain + dbName
    };
  }

}
