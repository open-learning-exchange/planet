import { Component, NgModule, EventEmitter, OnInit, Input, Output } from '@angular/core';

@Component({
  selector: 'star-rating',
  template: `
    <span class='star-rating1'>
    <ng-container *ngIf='!forDisplay'>
      <i *ngFor='let n of range; let $index = index;' class='fa to-rate' (click)='mark($index)' [ngClass]='isMarked($index)'></i>
    </ng-container>
    <ng-container *ngIf='forDisplay'>
      <i *ngFor='let n of range; let $index = index;' class="to-display fa" [ngClass]='isMarked($index)'></i>
    </ng-container>
</span>
  `
})
export class HighlightComponent implements OnInit {
    @Input() score;
    @Input() maxScore;
    @Input() forDisplay = false;
    @Output() rateChanged = new EventEmitter();
  range = [];
  marked = -1;

  constructor() { }

  ngOnInit() {
    for (let i = 0; i < this.maxScore; i++) {
      this.range.push(i);
    }
  }

  public mark = (index) => {
    this.marked = this.marked == index ? index - 1 : index;
    this.score = this.marked + 1;
    this.rateChanged.next(this.score);
  }

  public isMarked = (index) => {
    if (!this.forDisplay) {
      if (index <= this.marked) {
        return 'fa-star';
      } else {
        return 'fa-star-o';
      }
    } else {
      if (this.score >= index + 1) {
        return 'fa-star';
      } else if (this.score > index && this.score < index + 1) {
        return 'fa-star-half-o';
      } else {
        return 'fa-star-o';
      }
    }
    }
}
