import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material';
import { forkJoin, interval } from 'rxjs';
import { switchMap, takeWhile, map } from 'rxjs/operators';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and last character
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)$/.exec(str)[1];
};

const getProtocol = (str: string) => /^[^:]+(?=:\/\/)/.exec(str)[0];

@Component({
  selector: 'planet-migration',
  templateUrl: './migration.component.html',
  styles: [ `
    .mat-raised-button {
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

  @ViewChild('stepper', { static: false }) stepper: MatStepper;
  message = '';
  loginForm: FormGroup;
  configurationFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  cloneDomain = '';
  cloneProtocol = '';

  credential: any = {};

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
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
    const url = this.loginForm.controls.url.value;
    this.cloneProtocol = url.indexOf('http') > -1 ? getProtocol(url) : '';
    this.cloneDomain = url.indexOf('http') > -1 ? removeProtocol(url) : url;
    this.credential = { password: this.loginForm.controls.password.value, name: this.loginForm.controls.name.value };
    this.couchService.post('_session', this.credential, { withCredentials: true, domain: this.cloneDomain, protocol: this.cloneProtocol })
    .subscribe(() => {
      this.stepper.selected.completed = true;
      this.stepper.next();
    }, error => this.planetMessageService.showMessage('Configuration is not valid. Please check again.'));
  }

  clonePlanet() {
    this.couchService.get('_node/nonode@nohost/_config', { domain: this.cloneDomain, protocol: this.cloneProtocol }).pipe(
      switchMap(configuration => this.copyConfiguration(configuration)),
      switchMap(() => this.couchService.post('_session', this.credential, { withCredentials: true })),
      switchMap(() => this.getDatabaseNames()),
      switchMap((syncDatabases: string[]) => {
        return forkJoin(syncDatabases.map(db => this.syncService.sync(
          { db, parentDomain: this.cloneDomain, code: '', parentProtocol: this.cloneProtocol, type: 'pull' }, this.credential
        )))
      })
    ).subscribe(() => {
      this.planetMessageService.showMessage(`Planet is being synced with domain "${this.cloneDomain}". Please hold on.`);
      this.dialogsLoadingService.start();
      this.replicationCompletionCheck();
    });
  }

  replicationCompletionCheck() {
    interval(1000).pipe(
      switchMap(() => this.couchService.findAll('_replicator')),
      takeWhile((res: any[]) => res.some(r => r._replication_state !== 'completed'))
    ).subscribe(() => {}, () => {}, () => {
      this.router.navigate([ '/' ]);
      this.dialogsLoadingService.stop();
      this.planetMessageService.showMessage(`Cloning "${this.cloneDomain}" complete.`);
    });
  }

  copyConfiguration(configuration) {
    return forkJoin(
      Object.entries(configuration)
        .sort(( [ sectionA ], [ sectionB ]) => sectionA === 'admins' ? 1 : sectionB === 'admins' ? -1 : 0)
        .map(([ section, sectionValue ]) =>
          Object.entries(sectionValue).map(([ key, value ]) =>
            this.couchService.put(`_node/nonode@nohost/_config/${section}/${key}`, value)
          )
        )
        .flat()
    )
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
