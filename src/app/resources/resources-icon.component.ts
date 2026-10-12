import { Component, Input, OnChanges } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { fileTypes } from './resources.constants';
import { resourceFileType } from './resources.utils';

@Component({
  selector: 'planet-resource-icon',
  template: `
    @if (fileType) {
      <mat-icon class="km-resource-icon" role="img" aria-hidden="false" [attr.aria-label]="fileType.label"
        [matTooltip]="fileType.label" [matTooltipDisabled]="!showTooltip">
        {{fileType.icon}}
      </mat-icon>
    }
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; vertical-align: middle; margin-inline-end: 0.25rem; }
    mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
  `],
  imports: [ MatIcon, MatTooltip ]
})
export class ResourcesIconComponent implements OnChanges {

  @Input() resource: any;
  @Input() showTooltip = true;
  fileType: typeof fileTypes[number];

  ngOnChanges() {
    this.fileType = resourceFileType(this.resource);
  }

}
