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
  @Input() showAvatar = false;
  @Output() changeData = new EventEmitter<{ set, index }>();
  @Output() clickAction = new EventEmitter<any>();
  @ViewChildren('errorsTotal, errorsIndex') yScrollElements;
  @ViewChild('errorsUserTotal') xScrollElement;
  @ViewChild('errorsUser') dataElement;
  sets = [];
  horizTotals = [];

  ngOnChanges() {
    const fillEmptyItems = (items) => {
      return Array(this.height - items.length).fill('').concat(items);
    };
    this.sets = this.inputs.map(input => ({
      ...input,
      items: fillEmptyItems(input.items).reverse(),
      total: input.items.reduce((total, item) => total + (item.number || 0), 0)
    }));
    this.horizTotals = Array.from({ length: this.height }, (_, index) => {
      const count = this.sets.reduce((acc, set) => acc + (set.items[index]?.number || 0), 0);
      const clickable = this.sets.some(set => set.items[index]?.clickable);
      return { count, clickable };
    });
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

  labelClick(set) {
    this.clickAction.emit(set);
  }

  calculateSuccessPercentage(stepIndex: number): number | null {
    if (!this.sets || this.sets.length === 0) {
      return null;
    }
    const hasData = this.sets.some(set => set.items[stepIndex] && typeof set.items[stepIndex].number === 'number');
    if (!hasData) {
      return null;
    }
    const successfulAttempts = this.sets.filter(set => set.items[stepIndex]?.number === 0).length;
    const percentage = (successfulAttempts / this.sets.length) * 100;
    return percentage;
  }

  hasTestData(index: number): boolean {
    return this.sets.some(set => set.items[index] && set.items[index].number !== undefined);
  }

}
