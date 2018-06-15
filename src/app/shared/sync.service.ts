import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from './dialogs/dialogs-form.service';
import { PlanetMessageService } from './planet-message.service';
import { throwError } from 'rxjs';
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
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService
  ) {}

  private defaultConfig = {
    'create_target':  false,
    'continuous': false,
    'owner': this.userService.get().name
  };

  openConfirmation(syncData) {
    const title = 'Admin Confirmation';
    const formGroup = {
      password: [ '', Validators.required ]
    };
    this.dialogsFormService
    .confirm(title, passwordFormFields, formGroup)
    .pipe(
      debug('Dialog confirm'),
      switchMap((response: any) => {
        if (response !== undefined) {
          return this.createSessionAndReplicator(response.password, syncData);
        }
        return throwError('Invalid password');
      })
    )
    .subscribe((response: any) => {
      this.planetMessageService.showMessage(syncData.items.length + ' ' + syncData.dbName + ' ' + 'queued to fetch');
    }, () => error => this.planetMessageService.showMessage(error));
  }

  private createSessionAndReplicator(password, syncData) {
    return this.couchService.post('_session', { name: this.userService.get().name, password })
    .pipe(switchMap(() => {
      return this.createReplicator(password, syncData);
    }));
  }

  private replicatorDoc(adminPassword, itemIds, dbName, toParent) {
    const replicatorName = toParent ? '_to_parent' : '_from_parent';
    return {
      '_id': dbName + replicatorName + Date.now(),
      'target': this.dbObj(dbName, adminPassword, toParent),
      'source': this.dbObj(dbName, adminPassword, !toParent),
      'selector': { '$or': itemIds }
    };
  }

  private dbObj(dbName, adminPassword, parent: boolean) {
    const username = this.userService.get().name + (parent ? '@' + this.userService.getConfig().code : '');
    const domain = parent ? this.userService.getConfig().parentDomain + '/' : environment.couchAddress;
    const protocol = parent ? environment.centerProtocol + '://' : '';
    return {
      'headers': {
        'Authorization': 'Basic ' + btoa(username + ':' + adminPassword)
      },
      'url': protocol + domain + dbName
    };
  }

  private createReplicator(adminPassword, syncData) {
    const itemIds = syncData.items.map((res) => {
      return { _id: res._id, _rev: res._rev };
    });
    const syncConfig = this.replicatorDoc(adminPassword, itemIds, syncData.dbName, syncData.type === 'push');
    const replicator = { ...this.defaultConfig, ...syncConfig, continuous: syncData.continuous };
    return this.couchService.post('_replicator', replicator);
  }

}
