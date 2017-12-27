import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { debugOperator } from './app/debug-operator';
import { Observable } from 'rxjs/Observable';

Observable.prototype.debug = debugOperator;

declare module 'rxjs/Observable' {
  interface Observable<T> {
    debug: typeof debugOperator;
  }
}

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);
