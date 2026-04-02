import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ConfigurationCheckService } from '../shared/configuration-check.service';
import { MatCard } from '@angular/material/card';
import { MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PlanetLanguageComponent } from '../shared/planet-language.component';
import { RouterOutlet } from '@angular/router';

@Component({
    templateUrl: './login.component.html',
    styleUrls: ['./login.scss'],
    imports: [MatCard, MatAnchor, MatIcon, PlanetLanguageComponent, RouterOutlet]
})

export class LoginComponent implements OnInit {

  online = 'off';
  planetVersion: string;

  constructor(
    private couchService: CouchService,
    private configurationCheckService: ConfigurationCheckService
  ) {}

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

}
