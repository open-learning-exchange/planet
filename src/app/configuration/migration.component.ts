import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material/stepper';
import { EMPTY, forkJoin, interval } from 'rxjs';
import { catchError, finalize, map, switchMap, takeWhile, timeout } from 'rxjs/operators';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ConfigurationService } from './configuration.service';

/**
 * Removes a protocol prefix (for example, "https://") from a URL-like string.
 *
 * @param str a string containing a protocol followed by "//" and a domain
 * @returns the substring after the protocol separator
 * @throws Error when the string does not contain a valid protocol separator
 */
const removeProtocol = (str: string) => {
  const match = /\/\/(.*?)$/.exec(str);
  if (!match || !match[1]) {
    throw new Error('Invalid URL: missing protocol separator');
  }
  return match[1];
};

/**
 * Extracts the protocol portion from a URL-like string.
 *
 * @param str a string containing a protocol followed by "//" and a domain
 * @returns the protocol substring without trailing characters
 * @throws Error when the string does not contain a protocol
 */
const getProtocol = (str: string) => {
  const match = /^[^:]+(?=:\/\/)/.exec(str);
  if (!match || !match[0]) {
    throw new Error('Invalid URL: missing protocol');
  }
  return match[0];
};

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
  cloneForm: UntypedFormGroup;
  cloneDomain = '';
  cloneProtocol = '';
  admins: any = {};

  credential: any = {};

  private readonly replicationTimeoutMs = 120000;

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private couchService: CouchService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService,
    private configurationService: ConfigurationService
  ) { }

  ngOnInit() {
    this.cloneForm = this.formBuilder.group({
      url: [ '', Validators.required ],
      name: [ '', [
        Validators.required,
        CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
        Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i) ]
      ],
      password: [ '', Validators.required ]
    });
  }

  verifyAdmin() {
    const url = (this.cloneForm.controls.url.value || '').trim();
    try {
      const { protocol, domain } = this.parseCloneUrl(url);
      this.cloneProtocol = protocol;
      this.cloneDomain = domain;
    } catch {
      this.planetMessageService.showAlert($localize`Please enter a valid URL including protocol (for example, "https://example.com").`);
      return;
    }
    this.credential = { password: this.cloneForm.controls.password.value, name: this.cloneForm.controls.name.value };
    this.dialogsLoadingService.start();
    this.couchService.post('_session', this.credential, { withCredentials: true, domain: this.cloneDomain, protocol: this.cloneProtocol })
    .pipe(finalize(() => this.dialogsLoadingService.stop()))
    .subscribe(() => {
      this.stepper.selected.completed = true;
      this.stepper.next();
    }, () => this.planetMessageService.showAlert($localize`Configuration is not valid. Please check again.`));
  }

  clonePlanet() {
    const cloneFailureMessage = $localize`Cloning failed. Please verify that the remote server is reachable and the credentials are valid.`;
    this.dialogsLoadingService.start();
    this.planetMessageService.showMessage($localize`Copying configuration from "${this.cloneDomain}"...`);
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
      switchMap((syncDatabases: string[]) => forkJoin(syncDatabases.map(db => this.syncService.sync(this.syncDoc(db), this.credential)))),
      catchError(error => this.handleCloneError(error, cloneFailureMessage))
    ).subscribe(() => {
      this.planetMessageService.showMessage($localize`Planet is being synced with domain "${this.cloneDomain}". Please hold on.`);
      this.replicationCompletionCheck(() => this.cloneUserDbs());
    });
  }

  replicationCompletionCheck(callback = () => {}) {
    let replicationFailed = false;
    interval(1000).pipe(
      switchMap(() => this.couchService.findAll('_replicator')),
      takeWhile((res: any[]) => res.some(r => r._replication_state !== 'completed'), true),
      timeout(this.replicationTimeoutMs),
      catchError(error => {
        replicationFailed = true;
        return this.handleCloneError(error, $localize`Replication did not finish. Please verify CouchDB replication tasks and try again.`);
      })
    ).subscribe(() => {}, () => {}, () => {
      if (!replicationFailed) {
        callback();
      }
    });
  }

  cloneUserDbs() {
    this.couchService.findAll('configurations').pipe(
      switchMap((configurations: any[]) => this.configurationService.setCouchPerUser({ doc: configurations[0] })),
      switchMap(() => this.getDatabaseNames()),
      switchMap((allDatabases: string[]) => forkJoin(
        allDatabases.filter(db => db.indexOf('userdb-') > -1).map(db => this.syncService.sync(this.syncDoc(db), this.credential))
      )),
      catchError(error => this.handleCloneError(error, $localize`User database replication failed. Please try again.`))
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

  private parseCloneUrl(url: string): { protocol: string; domain: string } {
    if (!url) {
      throw new Error('Missing URL');
    }
    const hasProtocol = /^https?:\/\//i.test(url);
    return {
      protocol: hasProtocol ? getProtocol(url) : '',
      domain: hasProtocol ? removeProtocol(url) : url
    };
  }

  private handleCloneError(_error: any, message: string) {
    this.planetMessageService.showAlert(message);
    this.dialogsLoadingService.stop();
    return EMPTY;
  }

}
