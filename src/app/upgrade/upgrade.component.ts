import { Component, ViewEncapsulation } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ManagerService } from '../manager-dashboard/manager.service';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCard, MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions
} from '@angular/material/card';
import { FeedbackDirective } from '../feedback/feedback.directive';

@Component({
  templateUrl: './upgrade.component.html',
  styleUrls: ['./upgrade.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatToolbar,
    MatIconButton,
    RouterLink,
    MatIcon,
    MatButton,
    MatProgressBar,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCardActions,
    FeedbackDirective
  ]
})
export class UpgradeComponent {
  mode = 'planet';
  enabled = true;
  message = $localize`Start upgrade`;
  output = '';
  working = false;
  done = false;
  error = false;
  cleanOutput = '';
  timeoutTrials = 0;
  requiredBytes = 450 * 1024 * 1024;

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
        return this.checkDiskSpace();
      }),
      switchMap(() => this.syncService.openPasswordConfirmation()),
      switchMap((credentials: { name, password }) => this.managerService.updateCredentialsYml(credentials)),
      switchMap(() => this.managerService.addAdminLog('upgrade')),
      switchMap(() => {
        this.start();
        const requestParams = new HttpParams().set('v', parentVersion.trim());
        return this.http.get(environment.upgradeAddress, { responseType: 'text', params: requestParams });
      })
    ).subscribe(result => this.handleResult(result), err => this.handleError(err));
  }

  // The upgrade script ends with a RESULT line stating what actually happened.
  // Scanning the log for error text instead used to report a failed pull as a
  // successful upgrade, since Docker reports pull failures in a 200 response.
  handleResult(result) {
    const lines = result.split('\n');
    const resultLine = lines.filter(line => line.startsWith('RESULT:')).pop() || '';
    const failed = resultLine.startsWith('RESULT: error');

    lines.forEach(line => {
      if (line.startsWith('RESULT:')) {
        return;
      }

      if (line.includes('timeout') || line.includes('server misbehaving')) {
        this.addLine(line, 'upgrade_timeout');
        return;
      }

      this.addLine(line, failed ? 'upgrade_error' : 'upgrade_success');
    });

    if (failed) {
      this.handleError(resultLine.replace('RESULT: error', '').trim());
      return;
    }

    if (result.includes('timeout') || result.includes('server misbehaving')) {
      this.handleTimeout();
      return;
    }

    // myPlanet upgrades run a different script which reports no RESULT line.
    if (!resultLine && this.mode === 'planet') {
      this.handleError('The server did not report an upgrade result.');
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
    if (!string.length) {
      return;
    }
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
    // Errors reach here as a reason from the upgrade script, an Error, or an
    // HttpErrorResponse whose body holds the server's explanation. Stringifying
    // all three alike reduced the last two to an empty object.
    const raw = typeof err === 'string' ? err : (err?.error || err?.message || err);
    const detail = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 1);
    detail.split('\n').forEach(line => {
      this.addLine(line, 'upgrade_error');
    });
    this.working = false;
    this.message = $localize`Start upgrade`;
    this.error = true;
    this.done = true;
  }

  // Every image is pulled before any tag moves and the superseded set is kept
  // for rollback, so an upgrade needs more room than the installed footprint.
  // 450MB is the size treehouses/cli already reserves for planet.
  checkDiskSpace() {
    if (environment.production !== true) {
      return of(true);
    }
    return this.http.get(`${window.location.origin}/storage`, { responseType: 'text' }).pipe(
      catchError(() => of('')),
      map((free: string) => {
        const freeBytes = parseInt(free.trim(), 10);
        if (isNaN(freeBytes)) {
          return true;
        }
        this.addLine(`Free space: ${freeBytes} bytes`);
        if (freeBytes < this.requiredBytes) {
          throw new Error(`Not enough free space to upgrade: ${freeBytes} bytes free, ${this.requiredBytes} needed`);
        }
        return true;
      })
    );
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
