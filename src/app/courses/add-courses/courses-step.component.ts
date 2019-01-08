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
  styleUrls: [ 'courses-step.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class CoursesStepComponent implements OnDestroy {

  @Input() steps: any[];
  @Output() stepsChange = new EventEmitter<any>();
  @Output() addStepEvent = new EventEmitter<void>();

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
      res.tableData = res.tableData.filter((tableValue: any) => tableValue._attachments);
      const data = { okClick: this.dialogOkClick(db).bind(this),
        filterPredicate: filterSpecificFields([ 'title' ]),
        itemDescription: 'resources',
        nameProperty: 'title',
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

  stepsMoved(steps) {
    this.steps = steps;
    this.stepsChange.emit(this.steps);
  }

  addStep() {
    this.addStepEvent.emit();
  }

}
