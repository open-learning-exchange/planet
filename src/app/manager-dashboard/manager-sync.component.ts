import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { forkJoin } from 'rxjs';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { SyncDirective } from './sync.directive';
import { MatList, MatListItem, MatListItemTitle, MatListItemMeta, MatListItemLine, MatDivider } from '@angular/material/list';
import { NgFor, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  templateUrl: './manager-sync.component.html',
  styles: [`
    .mat-mdc-button > .mat-icon.svg-icon {
      height: inherit;
    }
  `],
  imports: [
    MatToolbar, MatIconButton, RouterLink, MatIcon, MatButton, SyncDirective, MatList, NgFor, MatListItem, NgClass,
    MatListItemTitle, NgIf, MatListItemMeta, NgSwitch, NgSwitchCase, NgSwitchDefault, MatListItemLine, MatDivider
  ]
})

export class ManagerSyncComponent implements OnInit {

  replicators = [];

  constructor(
    private couchService: CouchService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngOnInit() {
    this.getReplicators();
  }

  getReplicators() {
    this.dialogsLoadingService.start();
    forkJoin([
      this.couchService.get('_scheduler/docs'),
      this.couchService.findAll('_replicator')
    ]).subscribe(([ reps, data ]) => {
      const jobs = reps.docs.filter(replicator => replicator.database === '_replicator');
      this.replicators = data.map((rep: any) => ({ ...rep, ...jobs.find(n => n.doc_id === rep._id) }));
      this.dialogsLoadingService.stop();
    });
  }

}
