import { Component, Input } from '@angular/core';

import { MatIcon } from '@angular/material/icon';

@Component({
  'selector': 'planet-local-status',
  'template': `
@switch (status) {
  @case ('match') {
    <mat-icon i18n-title title="Upto date">done_all</mat-icon>
  }
  @case ('newerAvailable') {
    <mat-icon i18n-title title="Newer">fiber_new</mat-icon>
  }
  @case ('parentOlder') {
    <mat-icon i18n-title title="Older">timelapse</mat-icon>
  }
  @case ('mismatch') {
    <mat-icon i18n-title title="Does not match">priority_high</mat-icon>
  }
}
`,
  imports: [MatIcon]
})
export class PlanetLocalStatusComponent {
  @Input() status: string;
}
