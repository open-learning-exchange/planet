/* Structure for inputs = [
 *  {
 *    items: { number, fill? },
 *    label
 *  }
 * ]
 */
import { Component, Input, Output, EventEmitter, OnChanges, ViewChildren, ViewChild } from '@angular/core';

@Component({
  selector: 'planet-courses-progress-chart',
  templateUrl: 'courses-progress-chart.component.html',
  styleUrls: [ 'courses-progress-chart.scss' ]
})
export class CoursesProgressChartComponent implements OnChanges {

  @Input() inputs = [];
  @Input() label = '';
  @Input() height = 0;
  @Input() showTotals = true;
  @Output() changeData = new EventEmitter<{ set, index }>();
  @ViewChildren('errorsTotal, errorsIndex') yScrollElements;
  @ViewChild('errorsUserTotal', { static: false }) xScrollElement;
  @ViewChild('errorsUser', { static: false }) dataElement;
  sets = [];
  horizTotals = [];

  ngOnChanges() {
    const fillEmptyItems = (items) => [].concat(Array(this.height - items.length).fill(''), items);
    this.sets = this.inputs.map(input => ({
      ...input,
      items: fillEmptyItems(input.items),
      total: input.items.reduce((total, item) => total + (item.number || 0), 0)
    }));
    this.horizTotals = this.sets.reduce((totals, set) => {
      return set.items.map((item, index) => ({ count: (item.number || 0) + (totals[index].count), clickable: item.clickable }));
    }, Array(this.height).fill(0).map(() => ({ count: 0, clickable: false })));
  }

  dataClick(event, set, index) {
    this.changeData.emit({ set, index });
  }

  onDataScroll(event) {
    this.yScrollElements.forEach((elem) => {
      elem.nativeElement.scrollTo(0, event.srcElement.scrollTop);
    });
    this.xScrollElement.nativeElement.scrollTo(event.srcElement.scrollLeft, 0);
  }

  onDataMouseMove(event) {
    if (event.buttons === 1) {
      const element = this.dataElement.nativeElement;
      element.scrollTo(element.scrollLeft - event.movementX, element.scrollTop - event.movementY);
      event.preventDefault();
    }
  }

}
