import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { TagsService } from './tags.service';

@Component({
  template: `
    <span [ngSwitch]="selectedIds.length" class="small margin-lr-5">
      <span *ngSwitchCase="0" i18n>No collections selected</span>
      <span *ngSwitchCase="1"><span i18n>Selected:</span>{{' ' + tooltipLabels}}</span>
      <span *ngSwitchDefault [matTooltip]="tooltipLabels">Hover to see selected collections</span>
    </span>
  `,
  selector: 'planet-tag-selected-input'
})
export class PlanetTagSelectedInputComponent implements OnInit, OnChanges {

  @Input() selectedIds: string[] = [];
  @Input() parent = false;

  tooltipLabels = '';
  allTags: any[] = [];

  constructor(
    private tagsService: TagsService
  ) { }

  ngOnInit() {
    this.initTags();
    this.setTooltipLabels(this.selectedIds, this.allTags);
  }

  ngOnChanges() {
    this.setTooltipLabels(this.selectedIds, this.allTags);
  }

  initTags() {
    this.tagsService.getTags(this.parent).subscribe((tags: any[]) => {
      this.allTags = tags;
    });
  }

  setTooltipLabels(selectedIds, allTags) {
    const tagsNames = selectedIds.map((tag: any) => this.tagsService.findTag(tag, allTags).name);
    this.tooltipLabels = tagsNames.join(', ');
  }

}
