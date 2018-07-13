import { Component, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  templateUrl: './upgrade.component.html',
  styleUrls: [ './upgrade.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UpgradeComponent {
  enabled: Boolean = true;
  message = 'Start upgrade';
  output = '';
  working: Boolean = false;
  done: Boolean = false;
  error: Boolean = false;
  cleanOutput = '';

  constructor(private http: HttpClient) {
    this.addLine('Not started');
  }

  start() {
    this.enabled = false;
    this.message = 'Upgrading';
    this.working = true;
    this.addLine('Server request started');
    this.upgrade();
  }

  upgrade() {
    this.http.get(environment.upgradeAddress, { responseType: 'text' }).subscribe(result => {
      result.split('\n').forEach(line => {
        if (line.includes('timeout')) {
          this.addLine(line, 'upgrade_timeout');
          return;
        }
        this.addLine(line, 'upgrade_success');
      });

      if (result.includes('timeout')) {
        this.message = 'Retry';
        this.error = false;
        this.done = false;
        this.enabled = true;
        this.working = false;
        this.addLine('Request timed-out, try again.', 'upgrade_timeout');
        return;
      }

      this.message = 'Success';
      this.error = false;
      this.done = true;
    }, err => {
      this.addLine('An error ocurred:', true);
      JSON.stringify(err, null, 1).split('\n').forEach(line => {
        this.addLine(line, 'upgrade_error');
      });
      this.working = false;
      this.message = 'Start upgrade';
      this.error = true;
      this.done = true;
    });
  }

  getDateTime () {
    const date = new Date();
    const d = ('0'  + date.getDate()).slice(-2);
    const M = ('0'  + date.getMonth()).slice(-2);
    const Y = date.getFullYear();
    const h = ('0'  + date.getHours()).slice(-2);
    const m = ('0'  + date.getMinutes()).slice(-2);
    const s = ('0'  + date.getSeconds()).slice(-2);
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
}
