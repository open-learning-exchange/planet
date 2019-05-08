import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { TagsService } from './tags.service';

@Component({
  template: `
    <span [ngSwitch]="selectedTags.length" class="small margin-lr-5">
      <span *ngSwitchCase="0" i18n>No collections selected</span>
      <span *ngSwitchCase="1"><span i18n>Selected:</span>{{' ' + tooltipLabels}}</span>
      <span *ngSwitchDefault [matTooltip]="tooltipLabels">Hover to see selected collections</span>
    </span>
  `,
  selector: 'planet-tag-selected-input'
})
export class PlanetTagSelectedInputComponent implements OnInit, OnChanges {

  @Input() selectedTags: string[] = [];

  tooltipLabels = '';
  allTags: string[] = [];
  parent = false;

  constructor(
    private tagsService: TagsService
  ) { }

  ngOnInit() {
    this.initTags();
    this.setTooltipLabels(this.selectedTags, this.allTags);
  }

  ngOnChanges() {
    this.setTooltipLabels(this.selectedTags, this.allTags);
  }

  initTags() {
    this.tagsService.getTags(this.parent).subscribe((tags: string[]) => {
      this.allTags = tags;
    });
  }

  setTooltipLabels(selectedTags, allTags) {
    const tagsNames = selectedTags.map((tag: any) => this.tagsService.findTag(tag, allTags).name);
    this.tooltipLabels = tagsNames.join(', ');
  }

}
