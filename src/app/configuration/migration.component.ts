import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatStepper } from '@angular/material';
import { environment } from '../../environments/environment';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and last character
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)$/.exec(str)[1];
};

const getProtocol = (str: string) => /^[^:]+(?=:\/\/)/.exec(str)[0];

const cloneDatabases = [
  '_users',
  'achievements',
  'admin_activities',
  'apk_logs',
  'attachments',
  'child_statistics',
  'child_users',
  'communityregistrationrequests',
  'configurations',
  'courses',
  'courses_progress',
  'exams',
  'feedback',
  'hubs',
  'login_activities',
  'meetups',
  'myplanet_activities',
  'nations',
  'news',
  'notifications',
  'parent_users',
  'ratings',
  'replicator_users',
  'resource_activities',
  'resources',
  'send_items',
  'shelf',
  'submissions',
  'tablet_users',
  'tags',
  'team_activities',
  'teams'
];

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
  parentDomain = '';
  parentProtocol = '';

  credential: any = {};

  constructor(
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService
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
    this.parentProtocol = url.indexOf('http') > -1 ? getProtocol(url) : '';
    this.parentDomain = url.indexOf('http') > -1 ? removeProtocol(url) : url;
    this.credential = { password: this.loginForm.controls.password.value, name: this.loginForm.controls.name.value };
    this.couchService.post('_session', this.credential, { withCredentials: true, domain: this.parentDomain, protocol: this.parentProtocol })
    .subscribe(() => {
      this.stepper.selected.completed = true;
      this.stepper.next();
    }, error => this.planetMessageService.showMessage('Configuration is not valid. Please check again.'));
  }

  clonePlanet() {
    this.couchService.get('_node/nonode@nohost/_config', { domain: this.parentDomain, protocol: this.parentProtocol }).pipe(
      switchMap(configuration => forkJoin(Object.entries(configuration)
        .sort(( [ sectionA ], [ sectionB ]) => sectionA === 'admins' ? 1 : sectionB === 'admins' ? -1 : 0)
        .map(([ section, sectionValue ]) => Object.entries(sectionValue).map(([ key, value ]) =>
          this.couchService.put(`_node/nonode@nohost/_config/${section}/${key}`, value)
        ))
        .flat()
      )),
      switchMap(() => this.couchService.post('_session', this.credential, { withCredentials: true })),
      switchMap(() =>
        forkJoin(cloneDatabases.map(db => this.syncService.sync(
          { db, parentDomain: this.parentDomain, code: '', parentProtocol: this.parentProtocol, type: 'pull' }, this.credential
        ))
      )
    )).subscribe(() => {
      this.planetMessageService.showMessage(`Planet is being synced with domain "${this.parentDomain}". Please hold on.`);
    });
  }

}
