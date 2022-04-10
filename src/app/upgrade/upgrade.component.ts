import { Component, ViewEncapsulation } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ManagerService } from '../manager-dashboard/manager.service';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';

@Component({
  templateUrl: './upgrade.component.html',
  styleUrls: [ './upgrade.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UpgradeComponent {
  mode = 'planet';
  enabled: Boolean = true;
  message = $localize`Start upgrade`;
  output = '';
  working: Boolean = false;
  done: Boolean = false;
  error: Boolean = false;
  cleanOutput = '';
  timeoutTrials = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private couchService: CouchService,
    private stateService: StateService,
    private managerService: ManagerService,
    private syncService: SyncService
  ) {
    this.mode = this.route.snapshot.data.myPlanet === true ? 'myPlanet' : 'planet';
    this.addLine($localize`Not started`);
  }

  start() {
    this.enabled = false;
    this.message = $localize`Upgrading`;
    this.working = true;
    this.addLine($localize`Server request started`);
    this.timeoutTrials += 1;
  }

  upgrade() {
    if (this.mode === 'planet') {
      this.upgradePlanet();
    } else {
      this.upgradeMyPlanet();
    }
  }

  upgradePlanet() {
    let parentVersion: string;
    this.getParentVersion().pipe(
      switchMap((pVersion: string) => {
        parentVersion = pVersion;
        return this.syncService.openPasswordConfirmation();
      }),
      switchMap((credentials: { name, password }) => this.managerService.updateCredentialsYml(credentials)),
      switchMap(() => this.managerService.addAdminLog('upgrade')),
      switchMap(() => {
        this.start();
        const requestParams = new HttpParams().set('v', parentVersion.trim());
        return this.http.get(environment.upgradeAddress, { responseType: 'text', params: requestParams });
      })
    ).subscribe(result => this.handleResult(result), err => this.handleError(err));
  }

  handleResult(result) {
    result.split('\n').forEach(line => {
      if (line.includes('timeout') || line.includes('server misbehaving')) {
        this.addLine(line, 'upgrade_timeout');
        return;
      }

      if (line.includes('invalid reference format')) {
        this.handleError(line);
        return;
      }

      this.addLine(line, 'upgrade_success');
    });

    if (result.includes('timeout') || result.includes('server misbehaving')) {
      this.handleTimeout();
      return;
    }

    if (!this.error && this.working) {
      this.message = $localize`Success`;
      this.error = false;
      this.done = true;
    }
  }

  getDateTime() {
    const date = new Date();
    const d = ('0' + date.getDate()).slice(-2);
    const M = ('0' + (date.getMonth() + 1)).slice(-2);
    const Y = date.getFullYear();
    const h = ('0' + date.getHours()).slice(-2);
    const m = ('0' + date.getMinutes()).slice(-2);
    const s = ('0' + date.getSeconds()).slice(-2);
    return `[${d}/${M}/${Y} ${h}:${m}:${s}]`;
  }

  addLine(string, cssClass?) {
    if (!string.length) { return; }
    string = string.trim();
    const dTime = this.getDateTime();
    const start = `<span class=\'${cssClass}\'>`;
    this.output += `${start}${dTime} ${string}</span>\n`;
    this.cleanOutput += `${dTime} ${string}\n`;
  }

  handleTimeout() {
    this.message = 'Retry';
    this.error = false;
    this.done = false;
    this.enabled = true;
    this.working = false;

    if (this.timeoutTrials >= 5) {
      this.addLine($localize`Request timed-out`, 'upgrade_timeout');
      this.addLine($localize`Request timed-out 5 times. Please try again later.`, 'upgrade_error');
      this.enabled = false;
      this.error = true;
      this.done = true;
    } else {
      this.addLine($localize`Request timed-out, try again.`, 'upgrade_timeout');
    }
  }

  handleError(err) {
    this.addLine($localize`An error ocurred:`, 'upgrade_error');
    JSON.stringify(err, null, 1).split('\n').forEach(line => {
      this.addLine(line, 'upgrade_error');
    });
    this.working = false;
    this.message = $localize`Start upgrade`;
    this.error = true;
    this.done = true;
  }

  getParentVersion() {
    const opts = {
      domain: this.stateService.configuration.parentDomain,
      responseType: 'text',
      withCredentials: false,
      headers: { 'Content-Type': 'text/plain' }
    };
    return this.couchService.getUrl('version', opts).pipe(catchError(() => of('N/A')));
  }

  upgradeMyPlanet() {
    this.start();
    const upgradeUrl = '/planetapk';
    this.http.get(environment.upgradeAddress + upgradeUrl, { responseType: 'text' })
      .subscribe(result => this.handleResult(result), err => this.handleError(err));
  }

}
