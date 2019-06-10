import { Component, Input, Output, EventEmitter, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { CoursesAddResourcesComponent } from './courses-add-resources.component';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../../shared/table-helpers';

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
  dialogRef: MatDialogRef<CoursesAddResourcesComponent>;
  activeStep: any;
  activeStepIndex = -1;
  private onDestroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private coursesService: CoursesService,
    private dialogsListService: DialogsListService
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
    this.activeStepIndex = index;
    if (index > -1) {
      this.activeStep = this.steps[index];
      this.stepForm.patchValue(this.steps[index]);
    }
  }

  addResources() {
    this.dialogRef = this.dialog.open(CoursesAddResourcesComponent, { data: {
      okClick: this.resourcsDialogOkClick.bind(this),
      excludeIds: this.steps[this.activeStepIndex].resources.map((resource: any) => resource._id)
    } });
  }

  resourcsDialogOkClick(selected: any) {
    this.steps[this.activeStepIndex].resources = [
      ...this.steps[this.activeStepIndex].resources,
      ...selected.map(res => res.doc)
    ];
    this.activeStep = this.steps[this.activeStepIndex];
    this.stepsChange.emit(this.steps);
    this.dialogRef.close();
  }

  removeResource(position: number) {
    this.steps[this.activeStepIndex].resources.splice(position, 1);
  }

  addExam(type = 'exam') {
    this.coursesService.stepIndex = this.activeStepIndex;
    if (this.activeStep[type]) {
      this.router.navigate([ '/courses/update/exam/', this.activeStep[type]._id, { type } ]);
    } else {
      this.router.navigate([ '/courses/exam/', { type } ]);
    }
  }

  linkExam(type = 'courses') {
    const initialSelection = this.steps[this.activeStepIndex].survey ? [ this.steps[this.activeStepIndex].survey._id ] : [];
    this.dialogsListService.getListAndColumns('exams', { type })
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((surveys) => {
        const data = {
          okClick: this.dialogOkClick.bind(this),
          filterPredicate: filterSpecificFields([ 'name' ]),
          initialSelection,
          ...surveys };
        this.dialogRef = this.dialog.open(DialogsListComponent, {
          data, height: '500px', width: '600px', autoFocus: false
        });
      });
  }

  dialogOkClick(selected) {
    this.steps[this.activeStepIndex].survey = selected[0];
    this.activeStep = this.steps[this.activeStepIndex];
    this.stepsChange.emit(this.steps);
    this.dialogRef.close();
  }

  stepsMoved(steps) {
    this.steps = steps;
    this.stepsChange.emit(this.steps);
  }

  addStep() {
    this.addStepEvent.emit();
  }

}
