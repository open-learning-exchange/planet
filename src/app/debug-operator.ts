import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

const debuggerOn = !environment.production;

export const debugOperator = function<T> (message: string) {
  const source = this;
  if (debuggerOn) {
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
