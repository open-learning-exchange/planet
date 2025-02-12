import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { forkJoin, interval, Subscription, BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './manager-sync.component.html'
})

export class ManagerSyncComponent implements OnInit, OnDestroy {

  private syncSubscription: Subscription;
  private replicatorsSubject = new BehaviorSubject<any[]>([]);
  replicators$ = this.replicatorsSubject.asObservable();

  private readonly SYNC_INTERVAL = 3600000;
  private readonly LAST_SYNC_KEY = 'lastSyncTime';

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService
  ) { }

  private timedSync() {
    const lastSync = parseInt(localStorage.getItem(this.LAST_SYNC_KEY) || '0', 10);
    const now = Date.now();

    if (now - lastSync >= this.SYNC_INTERVAL) {
      this.syncReplicators();
    }

    this.syncSubscription = interval(this.SYNC_INTERVAL)
      .subscribe(() => {
        this.syncReplicators();
      });
  }

  private syncReplicators() {
    this.dialogsLoadingService.start();
    forkJoin([
      this.couchService.get('_scheduler/docs'),
      this.couchService.findAll('_replicator')
    ])
    .pipe(catchError(
      error => {
        this.planetMessageService.showMessage($localize`Error during synchronization ${error}`);
        this.dialogsLoadingService.stop();
        throw error;
      })
    )
    .subscribe(([ reps, data ]) => {
      const jobs = reps.docs.filter(replicator => replicator.database === '_replicator');
      const updatedReplicators = data.map((rep: any) => ({
        ...rep,
        ...jobs.find(n => n.doc_id === rep._id)
      }));
      this.replicatorsSubject.next(updatedReplicators);
      this.dialogsLoadingService.stop();
      localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
    });
  }

  ngOnInit() {
    this.timedSync();
    this.getReplicators();
  }

  getReplicators(): BehaviorSubject<any[]> {
    return this.replicatorsSubject;
  }

  ngOnDestroy() {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }

}
