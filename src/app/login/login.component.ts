import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ConfigurationCheckService } from '../shared/configuration-check.service';
import { LoginProgressService, LoginProgressState } from './login-progress.service';

@Component({
  templateUrl: './login.component.html',
  styleUrls: [ './login.scss' ]
})

export class LoginComponent implements OnInit {

  online = 'off';
  planetVersion: string;
  loginProgress$: Observable<LoginProgressState>;

  constructor(
    private couchService: CouchService,
    private configurationCheckService: ConfigurationCheckService,
    private loginProgressService: LoginProgressService
  ) {
    this.loginProgress$ = this.loginProgressService.progress$;
  }

  ngOnInit() {
    this.getPlanetVersion();
    this.configurationCheckService.checkConfiguration().subscribe(isOnline => {
      this.online = isOnline;
    });
  }

  getPlanetVersion() {
    const opts = { responseType: 'text', withCredentials: false, headers: { 'Content-Type': 'text/plain' } };
    this.couchService.getUrl('version', opts).pipe(catchError(() => of(require('../../../package.json').version)))
      .subscribe((version: string) => this.planetVersion = version);
  }

  progressMessage(progress: LoginProgressState) {
    switch (progress) {
      case 'authenticating':
        return $localize`Signing you in…`;
      case 'syncing':
        return $localize`Syncing your account…`;
      case 'navigating':
        return $localize`Loading your dashboard…`;
      case 'finalizing':
        return $localize`Finishing background updates…`;
      default:
        return '';
    }
  }

  isProgressActive(progress: LoginProgressState) {
    return progress !== 'idle' && progress !== 'complete';
  }

}
