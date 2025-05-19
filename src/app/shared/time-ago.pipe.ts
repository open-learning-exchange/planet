import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ 
  name: 'timeAgo', pure: true 
})
export class TimeAgoPipe implements PipeTransform {
  // cast Intl to any so TS stops complaining -> cleaner with ts ^4.1.2
  private rtf = new ( (Intl as any).RelativeTimeFormat )('en', { numeric: 'auto' });

  transform(value: string | number | Date): string {
    if (!value) return '';
    const then = new Date(value).getTime();
    const now  = Date.now();
    const diff = then - now;
    const units = [
      [ 'year',   1000 * 60 * 60 * 24 * 365 ],
      [ 'month',  1000 * 60 * 60 * 24 * 30 ],
      [ 'day',    1000 * 60 * 60 * 24 ],
      [ 'hour',   1000 * 60 * 60 ],
      [ 'minute', 1000 * 60 ],
      [ 'second', 1000 ],
    ] as const;

    for (const [unit, ms] of units) {
      const n = Math.round(diff / ms);
      if (Math.abs(n) >= 1) {
        return this.rtf.format(n, unit);
      }
    }
    return 'just now';
  }
}
