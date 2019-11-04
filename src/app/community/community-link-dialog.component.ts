import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { switchMap, mergeMap, takeWhile } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { SyncService } from '../shared/sync.service';
import { dedupeShelfReduce } from '../shared/utils';

@Component({
  templateUrl: './community-link-dialog.component.html',
  styleUrls: [ './community.scss' ]
})
export class CommunityLinkDialogComponent {

  links: { db, title, selector? }[] = [
    { db: 'resources', title: 'Library' },
    { db: 'teams', title: 'Teams', selector: { type: 'team' } },
    { db: 'teams', title: 'Enterprises', selector: { type: 'enterprise' } }
  ];



}
