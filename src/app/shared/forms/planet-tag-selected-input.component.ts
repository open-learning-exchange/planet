import { Component, Input, OnChanges, HostListener } from '@angular/core';
import { TagsService } from './tags.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { truncateText } from '../../shared/utils';

import { MatTooltip } from '@angular/material/tooltip';

  @Component({
    template: `
      <span class="small margin-lr-5">
        @switch (selectedIds.length) {
          @case (0) {
            <span i18n>No collections selected</span>
          }
          @case (1) {
            <span><span i18n>Selected:</span>
              {{ getTruncatedTooltip() }}
            </span>
          }
          @default {
            <span [matTooltip]="tooltipLabels"><span i18n>Hover to see selected collections</span></span>
          }
        }
      </span>
    `,
  selector: 'planet-tag-selected-input',
  imports: [MatTooltip]
})
export class PlanetTagSelectedInputComponent implements OnChanges {

  @Input() selectedIds: string[] = [];
  @Input() allTags: any[] = [];

  tooltipLabels = '';
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;

  constructor(
    private tagsService: TagsService,
    private deviceInfoService: DeviceInfoService
  ) {}

  ngOnChanges() {
    this.setTooltipLabels(this.selectedIds, this.allTags);
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  setTooltipLabels(selectedIds, allTags) {
    const tagsNames = selectedIds.map((tag: any) => this.tagsService.findTag(tag, allTags).name);
    this.tooltipLabels = tagsNames.join(', ');
  }

  getTruncatedTooltip(): string {
    const maxLength = this.deviceType === this.deviceTypes.DESKTOP ? 50 :
      this.deviceType === this.deviceTypes.TABLET ? 35 : 20;
    return truncateText(this.tooltipLabels, maxLength);
  }

}
