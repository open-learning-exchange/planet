import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators';

const debuggerOn = !environment.production;

const debug = function <T>(message: string) {
  var source = this;
  if(debuggerOn) {
    return source.pipe(tap(
      function (next) {
        console.log(message, next);
      },
      function (err) {
        console.error('ERROR >>> ', message, err);
      },
      function () {
        console.log(message, 'Completed.');
      }
    ));
  }
  return source;
};

Observable.prototype.debug = debug;

declare module 'rxjs/Observable' {
  interface Observable<T> {
    debug: typeof debug;
  }
}

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);
