import { Pipe, PipeTransform, Inject, LOCALE_ID } from '@angular/core';

@Pipe({
  name: 'timeAgo', pure: true
})
export class TimeAgoPipe implements PipeTransform {
  // Use the current app locale instead of hardcoded 'en'
  // cast Intl to any so TS stops complaining -> cleaner with ts ^4.1.2
  private rtf: any;

  constructor(@Inject(LOCALE_ID) private locale: string) {
    this.rtf = new ((Intl as any).RelativeTimeFormat)(this.locale, { numeric: 'auto' });
  }

  transform(value: string | number | Date): string {
    if (!value) { return ''; }
    const then = new Date(value).getTime();
    const now = Date.now();
    const diff = then - now;
    const units = [
      [ 'year', 1000 * 60 * 60 * 24 * 365 ],
      [ 'month', 1000 * 60 * 60 * 24 * 30 ],
      [ 'day', 1000 * 60 * 60 * 24 ],
      [ 'hour', 1000 * 60 * 60 ],
      [ 'minute', 1000 * 60 ],
      [ 'second', 1000 ],
    ] as const;

    for (const [ unit, ms ] of units) {
      const n = Math.round(diff / ms);
      if (Math.abs(n) >= 1) {
        return this.rtf.format(n, unit);
      }
    }
    return $localize`just now`;
  }
}
