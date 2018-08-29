import {
  Component,
  Input,
  EventEmitter,
  Output,
  Directive,
  ContentChildren,
  ViewChild,
  TemplateRef,
  Injectable,
  OnDestroy
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PlanetStepListService {

  stepMoveClick$ = new Subject<any>();

  constructor() {}

  moveStep(index, direction) {
    this.stepMoveClick$.next({ index, direction });
  }

}

@Component({
  selector: 'planet-step-list-item',
  template: `
    <ng-template>
      <ng-content></ng-content>
      <button mat-icon-button *ngIf="!isFirst" (click)="moveStep($event,-1)"><mat-icon>arrow_upward</mat-icon></button>
      <button mat-icon-button *ngIf="!isLast" (click)="moveStep($event,1)"><mat-icon>arrow_downward</mat-icon></button>
      <button mat-icon-button (click)="moveStep($event,i)"><mat-icon>delete</mat-icon></button>
    </ng-template>
  `
})
export class PlanetStepListItemComponent {
  @ViewChild(TemplateRef) template: TemplateRef<any>;
  index: number;
  isFirst: boolean;
  isLast: boolean;

  constructor(private planetStepListService: PlanetStepListService) {}

  moveStep(event, direction = 0) {
    event.stopPropagation();
    this.planetStepListService.moveStep(this.index, direction);
  }

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
export class PlanetStepListComponent implements OnDestroy {

  @Input() steps: any[];
  @Output() stepsChange = new EventEmitter<any[]>();
  @Input() nameProp: string;
  @Input() defaultName = 'Step';
  @Output() stepClicked = new EventEmitter<number>();

  @ContentChildren(PlanetStepListItemComponent) stepListItems;

  listMode = true;
  openIndex = -1;
  private onDestroy$ = new Subject<void>();

  constructor(private planetStepListService: PlanetStepListService) {
    this.planetStepListService.stepMoveClick$.pipe(takeUntil(this.onDestroy$)).subscribe(this.moveStep.bind(this));
  }

  ngAfterContentChecked() {
    this.stepListItems.forEach((item, index, array) => {
      item.index = index;
      item.isFirst = index === 0;
      item.isLast = index === (array.length - 1);
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  stepClick(index: number) {
    this.listMode = false;
    this.openIndex = index;
    this.stepClicked.emit(index);
  }

  toList() {
    this.listMode = true;
  }

  moveStep({ index, direction }) {
    const step = this.steps.splice(index, 1)[0];
    if (direction !== 0) {
      this.steps.splice(index + direction, 0, step);
    }
    this.stepsChange.emit(this.steps);
  }

}

@Directive({
  selector: '[planetStepListForm]'
})
export class PlanetStepListFormDirective {}
