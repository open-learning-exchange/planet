import { Component, Input, Output, EventEmitter, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../../shared/table-helpers';
import { CoursesService } from '../courses.service';

@Component({
  selector: 'planet-courses-step',
  templateUrl: 'courses-step.component.html',
  styles: [ `
    planet-courses-step .mat-chip-list-wrapper {
      margin: 0;
    }
  ` ],
  encapsulation: ViewEncapsulation.None
})
export class CoursesStepComponent implements OnDestroy {

  @Input() steps: any[];
  @Output() stepsChange = new EventEmitter<any>();

  stepForm: FormGroup;
  dialogRef: MatDialogRef<DialogsListComponent>;
  activeStep: any;
  activeStepIndex = -1;
  spinnerOn = true;
  private onDestroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog,
    private coursesService: CoursesService,
  ) {
    this.stepForm = this.fb.group({
      id: '',
      stepTitle: '',
      description: ''
    });
    this.stepForm.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(value => {
      this.steps[this.activeStepIndex] = { ...this.activeStep, ...value };
      this.stepsChange.emit(this.steps);
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  stepClick(index: number) {
    this.activeStep = this.steps[index];
    this.activeStepIndex = index;
    this.stepForm.patchValue(this.steps[index]);
  }

  attachItem(db: string) {
    const initialSelection = this.activeStep.resources.map(resource => resource._id);
    this.dialogsListService.getListAndColumns(db).pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      const data = { okClick: this.dialogOkClick(db).bind(this),
        filterPredicate: filterSpecificFields([ 'title' ]),
        selectionOptional: true,
        allowMulti: true,
        initialSelection,
        ...res };
      this.openDialog(data);
      this.spinnerOn = false;
    });
  }

  dialogOkClick(db: string) {
    return (selected: any) => {
      this.steps[this.activeStepIndex].resources = selected;
      this.activeStep = this.steps[this.activeStepIndex];
      this.stepsChange.emit(this.steps);
      this.dialogRef.close();
    };
  }

  openDialog(data) {
    this.dialogRef = this.dialog.open(DialogsListComponent, {
      data: data,
      height: '500px',
      width: '600px',
      autoFocus: false
    });
    this.dialogRef.afterClosed().subscribe(() => this.spinnerOn = true);
  }

  removeResource(position: number) {
    this.steps[this.activeStepIndex].resources.splice(position, 1);
  }

  addExam() {
    this.coursesService.stepIndex = this.activeStepIndex;
    if (this.activeStep.exam) {
      this.router.navigate([ '/courses/update/exam/', this.activeStep.exam._id ]);
    } else {
      this.router.navigate([ '/courses/exam/' ]);
    }
  }

  moveStep(event, i, direction = 0) {
    event.stopPropagation();
    const step = this.steps.splice(i, 1)[0];
    if (direction !== 0) {
      this.steps.splice(i + direction, 0, step);
    }
    this.stepsChange.emit(this.steps);
  }

}
