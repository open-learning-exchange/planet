import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material/stepper';
import { forkJoin, interval } from 'rxjs';
import { switchMap, takeWhile, map, finalize } from 'rxjs/operators';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ConfigurationService } from './configuration.service';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and last character
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)$/.exec(str)[1];
};

const getProtocol = (str: string) => /^[^:]+(?=:\/\/)/.exec(str)[0];

interface MigrationForm {
  url: FormControl<string>;
  name: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'planet-migration',
  templateUrl: './migration.component.html',
  styles: [ `
    .mat-mdc-raised-button {
      margin: 0px 2px 2px 0px;
    }
    .configuration-form {
      grid-template-areas: "none none ." "none none none";
      justify-items: center;
    }
    .advanced {
      grid-column-start: 2;
    }
  ` ]
})
export class MigrationComponent implements OnInit {

  @ViewChild('stepper') stepper: MatStepper;
  cloneForm: FormGroup<MigrationForm>;
  cloneDomain = '';
  cloneProtocol = '';
  admins: any = {};

  credential: any = {};

  constructor(
    private router: Router,
    private fb: NonNullableFormBuilder,
    private couchService: CouchService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService,
    private configurationService: ConfigurationService
  ) { }

  ngOnInit() {
    this.cloneForm = this.fb.group({
      url: ['', Validators.required],
      name: ['', [
        Validators.required,
        CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
        Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i)
      ]],
      password: ['', Validators.required]
    });
  }

  verifyAdmin() {
    const url = this.cloneForm.controls.url.value;
    this.cloneProtocol = url.indexOf('http') > -1 ? getProtocol(url) : '';
    this.cloneDomain = url.indexOf('http') > -1 ? removeProtocol(url) : url;
    this.credential = { password: this.cloneForm.controls.password.value, name: this.cloneForm.controls.name.value };
    this.dialogsLoadingService.start();
    this.couchService.post('_session', this.credential, { withCredentials: true, domain: this.cloneDomain, protocol: this.cloneProtocol })
    .pipe(finalize(() => this.dialogsLoadingService.stop()))
    .subscribe(() => {
      this.stepper.selected.completed = true;
      this.stepper.next();
    }, error => this.planetMessageService.showMessage($localize`Configuration is not valid. Please check again.`));
  }

  clonePlanet() {
    this.couchService.get('_node/nonode@nohost/_config', { domain: this.cloneDomain, protocol: this.cloneProtocol }).pipe(
      switchMap(configuration => this.copyConfiguration(configuration)),
      switchMap(() => {
        const [ name, password ] = Object.entries(this.admins).find(user => this.credential.name === user[0]);
        return this.couchService.put(`_node/nonode@nohost/_config/admins/${name}`, password);
      }),
      switchMap(() => this.couchService.post('_session', this.credential, { withCredentials: true })),
      switchMap(() => {
        return Object.entries(this.admins).filter(admin => admin[0] !== this.credential.name)
          .map(admin => this.couchService.put(`_node/nonode@nohost/_config/admins/${admin[0]}`, admin[1]));
      }),
      switchMap(() => this.getDatabaseNames()),
      switchMap((syncDatabases: string[]) => forkJoin(syncDatabases.map(db => this.syncService.sync(this.syncDoc(db), this.credential))))
    ).subscribe(() => {
      this.planetMessageService.showMessage($localize`Planet is being synced with domain "${this.cloneDomain}". Please hold on.`);
      this.dialogsLoadingService.start();
      this.replicationCompletionCheck(() => this.cloneUserDbs());
    });
  }

  replicationCompletionCheck(callback = () => {}) {
    interval(1000).pipe(
      switchMap(() => this.couchService.findAll('_replicator')),
      takeWhile((res: any[]) => res.some(r => r._replication_state !== 'completed'))
    ).subscribe(() => {}, () => {}, () => {
      callback();
    });
  }

  cloneUserDbs() {
    this.couchService.findAll('configurations').pipe(
      switchMap((configurations: any[]) => this.configurationService.setCouchPerUser({ doc: configurations[0] })),
      switchMap(() => this.getDatabaseNames()),
      switchMap((allDatabases: string[]) => forkJoin(
        allDatabases.filter(db => db.indexOf('userdb-') > -1).map(db => this.syncService.sync(this.syncDoc(db), this.credential))
      ))
    ).subscribe(() => {
      this.replicationCompletionCheck(() => this.completeMigration());
    });
  }

  completeMigration() {
    this.router.navigate([ '/' ]);
    this.dialogsLoadingService.stop();
    this.planetMessageService.showMessage($localize`Cloning "${this.cloneDomain}" complete.`);
  }

  syncDoc(db: string) {
    return { db, parentDomain: this.cloneDomain, code: '', parentProtocol: this.cloneProtocol, type: 'pull' };
  }

  copyConfiguration(configuration) {
    this.admins = configuration.admins;
    return forkJoin(
      Object.entries(configuration)
        .filter(( [ section ]) => section !== 'admins')
        .map(([ section, sectionValue ]) =>
          Object.entries(sectionValue).map(([ key, value ]) =>
            this.couchService.put(`_node/nonode@nohost/_config/${section}/${key}`, value)
          )
        )
        .flat()
    );
  }

  getDatabaseNames() {
    return forkJoin(
      this.couchService.get('_all_dbs', { domain: this.cloneDomain, protocol: this.cloneProtocol }),
      this.couchService.get('_all_dbs')
    ).pipe(map(([ cloneDatabases, localDatabases ]: [ string[], string[] ]) =>
      cloneDatabases.filter(db => db !== '_replicator' && db !== '_global_changes' && localDatabases.indexOf(db) > -1)
    ));
  }

}
