import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from './dialogs/dialogs-form.service';
import { PlanetMessageService } from './planet-message.service';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { debug } from '../debug-operator';

@Injectable()
export class SyncService {

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService
  ) {}

  private syncItems: any;
  private dbName: string;
  private continuous: boolean;

  private defaultConfig = {
    'create_target':  false,
    'continuous': false,
    'owner': this.userService.get().name
  };

  openConfirmation(syncData) {
    const title = 'Admin Confirmation';
    const fields = [
      {
        'label': 'Password',
        'type': 'textbox',
        'inputType': 'password',
        'name': 'password',
        'placeholder': 'Password',
        'required': true
      }
    ];
    const formGroup = {
      password: [ '', Validators.required ]
    };
    this.dialogsFormService
    .confirm(title, fields, formGroup)
    .pipe(debug('Dialog confirm'))
    .subscribe((response: any) => {
      if (response !== undefined) {
        this.couchService.post('_session', { name: this.userService.get().name, password: response.password })
        .pipe(switchMap(data => {
          return this.createReplicator(response.password, syncData);
        }))
        .subscribe(data => {
          this.planetMessageService.showMessage(this.syncItems.length + ' ' + this.dbName + ' ' + 'queued to fetch');
        }, error => this.planetMessageService.showMessage('Invalid password'));
      }
    });
  }

  private fetchParent(adminPassword) {
    const itemIds = this.syncItems.map((res) => {
      return { _id: res._id, _rev: res._rev };
    });
    const adminName = this.userService.get().name + '@' + this.userService.getConfig().code;
    return {
      '_id': this.dbName + '_from_parent' + Date.now(),
      'source': {
        'headers': {
          'Authorization': 'Basic ' + btoa(adminName + ':' + adminPassword)
        },
        'url': 'https://' + this.userService.getConfig().parentDomain + '/' + this.dbName
      },
      'target': {
        'headers': {
          'Authorization': 'Basic ' + btoa(this.userService.get().name + ':' + adminPassword)
        },
        'url': environment.couchAddress + this.dbName
      },
      'document': itemIds
    };
  }

  private pushParent(adminPassword) {
    const itemIds = this.syncItems.map((res) => {
      return { _id: res._id, _rev: res._rev };
    });
    const adminName = this.userService.get().name + '@' + this.userService.getConfig().code;
    return {
      '_id': this.dbName + '_to_parent' + Date.now(),
      'target': {
        'headers': {
          'Authorization': 'Basic ' + btoa(adminName + ':' + adminPassword)
        },
        'url': 'https://' + this.userService.getConfig().parentDomain + '/' + this.dbName
      },
      'source': {
        'headers': {
          'Authorization': 'Basic ' + btoa(this.userService.get().name + ':' + adminPassword)
        },
        'url': environment.couchAddress + this.dbName
      },
      'document': itemIds
    };
  }

  private createReplicator(adminPassword, syncData) {
    this.syncItems = syncData.items;
    this.dbName = syncData.dbName;
    let syncConfig = {};
    switch (syncData.type) {
      case 'fetch':
        syncConfig = this.fetchParent(adminPassword);
        break;
      case 'push':
        syncConfig = this.pushParent(adminPassword);
        break;
    }
    const replicator = { ...this.defaultConfig, ...syncConfig, continuous: syncData.continuous };
    return this.couchService.post('_replicator', replicator);
  }

}
