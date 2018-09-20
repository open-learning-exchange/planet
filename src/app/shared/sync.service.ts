import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ManagerService } from '../manager-dashboard/manager.service';

@Injectable()
export class SyncService {

  private parentDomain: string;
  private code: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private managerService: ManagerService
  ) {}

  createChildPullDoc(items: any[], db, planetCode) {
    const resourcesToSend = items.map(item => ({ db, sendTo: planetCode, item }));
    return this.couchService.post('send_items/_bulk_docs', { 'docs': resourcesToSend });
  }

  confirmPasswordAndRunReplicators(replicators) {
    return this.managerService.openPasswordConfirmation().pipe(switchMap((credentials) => {
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

  private syncParams(replicator, credentials, type) {
    const dbSource = replicator.dbSource || replicator.db;
    const dbTarget = replicator.dbTarget || replicator.db;
    if (replicator.items) {
      replicator.selector = this.itemSelector(replicator.items);
    }
    return {
      // Name the id always after the local database
      '_id': (type === 'push' ? dbSource : dbTarget) + '_' + type + (replicator.date ? '_' + Date.now() : ''),
      'source': this.dbObj(dbSource, credentials, type === 'pull' && type !== 'internal'),
      'target': this.dbObj(dbTarget, credentials, type !== 'pull' && type !== 'internal'),
      'selector': replicator.selector,
      'create_target':  false,
      'owner': credentials.name,
      'continuous': replicator.continuous
    };
  }

  private itemSelector(items) {
    return { '$or': items.map((res) => ({ _id: res._id, _rev: res._rev })) };
  }

  private dbObj(dbName, credentials, parent: boolean) {
    const username = credentials.name + (parent ? '@' + this.code : '');
    const domain = parent ? this.parentDomain + '/' : environment.syncAddress + '/';
    const protocol = parent ? environment.parentProtocol + '://' : '';
    return {
      'headers': {
        'Authorization': 'Basic ' + btoa(username + ':' + credentials.password)
      },
      'url': protocol + domain + dbName
    };
  }

}
