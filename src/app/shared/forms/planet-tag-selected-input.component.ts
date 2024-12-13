import { Component, Input, OnChanges, HostListener } from '@angular/core';
import { TagsService } from './tags.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';

@Component({
  template: `
    <span [ngSwitch]="selectedIds.length" class="small margin-lr-5">
      <span *ngSwitchCase="0" i18n>No collections selected</span>
      <span *ngSwitchCase="1"><span i18n>Selected:</span>
        {{ truncatedTooltip }}
      <span *ngSwitchDefault [matTooltip]="tooltipLabels" i18n>Hover to see selected collections</span>
    </span>
  `,
  selector: 'planet-tag-selected-input'
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

  get truncatedTooltip(): string {
    const maxLength = this.deviceType === this.deviceTypes.DESKTOP ? 50 :
                      this.deviceType === this.deviceTypes.TABLET ? 35 : 20;
    return this.tooltipLabels.length > maxLength
      ? this.tooltipLabels.slice(0, maxLength) + '...'
      : this.tooltipLabels;
  }

}
