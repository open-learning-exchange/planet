import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

const debuggerOn = !environment.production;

const logger = (args: any[]) => {
  if (debuggerOn) {
    console.log.apply(null, args);
  }
};

export const debug = <T>(message: string) => (source: Observable<T>) => new Observable<T>((subscriber) => {
  source.subscribe({
    next(value) {
      logger([ message, value ]);
      subscriber.next(value);
    },
    error(err) {
      logger([ 'ERROR >>> ', message, err ]);
      subscriber.error(err);
    },
    complete() {
      logger([ message, 'Completed.' ]);
      subscriber.complete();
    }
  });
});
