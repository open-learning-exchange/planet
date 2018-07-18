import { Component, Input, OnChanges, HostBinding } from '@angular/core';

@Component({
  selector: 'planet-stacked-bar',
  template: `
    <div class="stacked-bar"
      *ngFor="let item of data; index as i"
      [ngClass]="item.class"
      [ngStyle]="{'grid-column-start':i+1}">
      <span [ngStyle]="{'float':item.align || 'left'}" [ngClass]="{'invisible':item.noLabel}">
        {{item.percent | percent}}
      </span>
    </div>
  `,
  styles: [ `
    :host {
      height: 0.75rem;
      display: grid;
      align-content: center;
    }
    .stacked-bar {
      overflow: hidden;
      font-size: 0.7em;
    }
    .stacked-bar span {
      margin: 0 0.2rem;
    }
  ` ]
})
export class PlanetStackedBarComponent implements OnChanges {

  @Input() data = [];
  @HostBinding('style.grid-template-columns') barSizes = '1fr';

  ngOnChanges() {
    const total = this.data.reduce((t, item) => t + item.amount, 0);
    this.data = this.data.map(item => ({ ...item, percent: (item.amount / total) }));
    this.barSizes = this.data.reduce((sizes, item) => sizes + (item.percent + 'fr '), '');
    this.barSizes.trim();
  }

}
