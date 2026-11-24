import { Component, input, model } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatFormFieldAppearance, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'planet-search-field',
  template: `
    <mat-form-field [appearance]="appearance()" subscriptSizing="dynamic" class="font-size-1">
      <mat-label>{{ label() }}</mat-label>
      <mat-icon matIconPrefix>search</mat-icon>
      <input matInput [value]="value()" (input)="value.set($event.target.value)">
      <button type="button" mat-icon-button matSuffix (click)="value.set('')" [style.visibility]="value() ? 'visible' : 'hidden'"
        matTooltip="Clear search" i18n-matTooltip i18n-aria-label aria-label="Clear search">
        <mat-icon>close</mat-icon>
      </button>
    </mat-form-field>
  `,
  // Pages size the field through classes on this element, so the field fills it
  styles: [`
    :host {
      display: inline-flex;
      min-width: 0;
    }

    mat-form-field {
      flex: 1 1 auto;
      min-width: 0;
    }
  `],
  imports: [ MatFormField, MatLabel, MatPrefix, MatSuffix, MatIcon, MatIconButton, MatInput, MatTooltip ]
})
export class SearchFieldComponent {
  readonly label = input.required<string>();
  readonly appearance = input<MatFormFieldAppearance>('fill');
  readonly value = model('');
}
