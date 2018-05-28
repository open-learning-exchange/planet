import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

const debuggerOn = !environment.production;

const logger = (args: any[]) => {
  if (debuggerOn) {
    console.log.apply(null, args);
  }
};

export const debug = <T>(message: string) => (source: Observable<T>) =>
  source.pipe(tap(
    value => logger([ message, value ]),
    err => logger([ 'ERROR >>> ', message, err ]),
    () => logger([ message, 'Completed.' ])
  ));


