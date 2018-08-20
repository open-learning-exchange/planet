import { Component, Input, EventEmitter, Output, Directive, ContentChildren, ViewChild, TemplateRef } from '@angular/core';

@Component({
  selector: 'planet-step-list-item',
  template: '<ng-template><ng-content></ng-content></ng-template>'
})
export class PlanetStepListItemComponent {
  @ViewChild(TemplateRef) template: TemplateRef<any>;
}

@Component({
  selector: 'planet-step-list',
  templateUrl: './planet-step-list.component.html',
  styles: [ `
    .back-button {
      padding: 0 0.5rem 0 0;
      margin: 0.5rem 0;
    }
  ` ]
})
export class PlanetStepListComponent {

  @Input() steps: any[];
  @Input() nameProp: string;
  @Input() defaultName = 'Step';
  @Output() stepClicked = new EventEmitter<number>();
  @Output() stepUpdated = new EventEmitter<number>();

  @ContentChildren(PlanetStepListItemComponent) stepListItems;

  listMode = true;
  openIndex = -1;

  constructor() {}

  stepClick(index: number) {
    this.listMode = false;
    this.openIndex = index;
    this.stepClicked.emit(index);
  }

  toList() {
    this.listMode = true;
    this.stepUpdated.emit(this.openIndex);
  }

}

@Directive({
  selector: '[planetStepListForm]'
})
export class PlanetStepListFormDirective {}
