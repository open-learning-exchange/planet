import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

export class LoadingState {
  private _isLoading = true;

  get isLoading(): boolean {
    return this._isLoading;
  }

  set isLoading(value: boolean) {
    this._isLoading = value;
  }

  constructor(initialState = true) {
    this._isLoading = initialState;
  }
}

/**
 * Utility function to manage loading state around an observable.
 * Sets isLoading to true on subscription (implicitly handled by caller usually)
 * and false on finalize.
 *
 * Usage:
 * this.service.getData().pipe(
 *   load(this) // if this has isLoading property
 * )
 */
export function load<T>(loadingState: { isLoading: boolean }): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) => {
    loadingState.isLoading = true;
    return source.pipe(
      finalize(() => loadingState.isLoading = false)
    );
  };
}
