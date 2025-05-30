/* Structure for inputs = [
 *  {
 *    items: { number, fill? },
 *    label
 *  }
 * ]
 */
import { Component, Input, Output, EventEmitter, OnChanges, ViewChildren, ViewChild, AfterViewInit, AfterViewChecked } from '@angular/core';

@Component({
  selector: 'planet-courses-progress-chart',
  templateUrl: 'courses-progress-chart.component.html',
  styleUrls: [ 'courses-progress-chart.scss' ]
})
export class CoursesProgressChartComponent implements OnChanges, AfterViewInit, AfterViewChecked {

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
  private shouldScrollToBottom = false;

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
    this.shouldScrollToBottom = true;
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom() {
    if (this.dataElement && this.dataElement.nativeElement) {
      setTimeout(() => {
        const element = this.dataElement.nativeElement;
        element.scrollTop = element.scrollHeight;
        this.yScrollElements.forEach((elem) => {
          elem.nativeElement.scrollTop = elem.nativeElement.scrollHeight;
        });
      });
    }
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

}
