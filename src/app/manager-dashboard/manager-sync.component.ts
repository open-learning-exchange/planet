import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { forkJoin } from 'rxjs/observable/forkJoin';

@Component({
  template: `
    <div *ngFor="let rep of replicators">
    {{rep.doc._id}} {{rep.doc._replication_state_time}} {{rep.doc._replication_state}}
    </div>
    <div>{{message}}</div>
  `
})

export class ManagerSyncComponent implements OnInit {
  isUserAdmin = false;
  displayDashboard = true;
  message = '';
  planetType = this.userService.getConfig().planetType;
  replicators: any;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (!this.isUserAdmin) {
      // A non-admin user cannot receive all user docs
      this.displayDashboard = false;
      this.message = 'Access restricted to admins';
    }
    this.getSync();
  }

  getSync() {
    const observers = [];
    const dbNames = [
      'resources_rep',
      'courses_rep'
    ];
    dbNames.map((db: any) => {
      const downLink = {
        '_id': db + '_from_' + 'earth',
        'source': {
          'headers': {
            'Authorization': 'Basic ' + this.userService.getBase64()
          },
          // 'url': 'https://' + this.userService.getConfig().parentDomain + '/' + db
          'url': 'https://earth.ole.org:2200/' + db
        },
        'target': {
          'headers': {
            'Authorization': 'Basic ' + this.userService.getBase64()
          },
          'url': 'https://' + this.userService.getConfig().parentDomain + '/' + db
          // 'url': environment.couchAddress + db
        },
        'create_target':  false,
        'continuous': false,
        'user_ctx': {
          'name': this.userService.get().name,
          'roles': this.userService.get().roles
        },
        'owner': this.userService.get().name
      };
      // obserables.push(this.couchService.post('_replicator', repData));
      observers.push(this.couchService.post('_replicator', downLink, { domain: this.userService.getConfig().parentDomain }));
      const upLink = Object.assign({}, downLink, { '_id': db + '_to_' + 'earth', source: downLink.target, target: downLink.source });
      observers.push(this.couchService.post('_replicator', upLink, { domain: this.userService.getConfig().parentDomain }));
    });
    forkJoin(observers).subscribe((data) => {
      this.planetMessageService.showMessage('Replication successful');
    }, (error) => this.planetMessageService.showMessage('Replication scheduled'));
    // this.couchService.get('_replicator/_all_docs?include_docs=true')
    this.couchService.get('_replicator/_all_docs?include_docs=true', { domain: this.userService.getConfig().parentDomain })
    .subscribe((jobs) => {
      this.replicators = jobs.rows;
    });
  }

}
