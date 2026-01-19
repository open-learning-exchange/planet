import { Component, Input, Output, EventEmitter, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { DialogsAddResourcesComponent } from '../../shared/dialogs/dialogs-add-resources.component';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { PlanetStepListComponent } from '../../shared/forms/planet-step-list.component';

interface CoursesStepForm {
  id: FormControl<string>;
  stepTitle: FormControl<string>;
  description: FormControl<string>;
}

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

  stepForm: FormGroup<CoursesStepForm>;
  dialogRef: MatDialogRef<DialogsAddResourcesComponent>;
  activeStep: any;
  activeStepIndex = -1;
  private onDestroy$ = new Subject<void>();
  @ViewChild(PlanetStepListComponent) stepListComponent: PlanetStepListComponent;

  get examButtonLabel(): string {
    return this.activeStep?.exam ? $localize`Update Test` : $localize`Add Test`;
  }

  get surveyButtonLabel(): string {
    return this.activeStep?.survey ? $localize`Update Survey` : $localize`Add Survey`;
  }

  constructor(
    private router: Router,
    private fb: NonNullableFormBuilder,
    private dialog: MatDialog,
    private coursesService: CoursesService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.stepForm = this.fb.group<CoursesStepForm>({
      id: this.fb.control(''),
      stepTitle: this.fb.control(''),
      description: this.fb.control('')
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
    this.dialogRef = this.dialog.open(DialogsAddResourcesComponent, {
      width: '80vw',
      data: {
        okClick: this.resourcsDialogOkClick.bind(this),
        excludeIds: this.steps[this.activeStepIndex].resources.map((resource: any) => resource._id),
        canAdd: true
    } });
  }

  resourcsDialogOkClick(selected: any) {
    this.steps[this.activeStepIndex].resources = [
      ...this.steps[this.activeStepIndex].resources,
      ...selected.map(res => res.doc)
    ];
    this.activeStep = this.steps[this.activeStepIndex];
    this.stepsChange.emit(this.steps);
    this.dialogsLoadingService.stop();
    this.dialogRef.close();
  }

  removeResource(position: number) {
    const resources = this.steps[this.activeStepIndex]?.resources;
    if (!resources || position < 0 || position >= resources.length) {
      return;
    }
    resources.splice(position, 1);
    this.activeStep = this.steps[this.activeStepIndex];
    this.stepsChange.emit(this.steps);
  }

  addExam(type = 'exam') {
    this.coursesService.stepIndex = this.activeStepIndex;
    if (this.activeStep[type]) {
      this.router.navigate([ '/courses/update/exam/', this.activeStep[type]._id, { type } ]);
    } else {
      this.router.navigate([ '/courses/exam/', { type } ]);
    }
  }

  stepsMoved(steps) {
    this.steps = steps;
    this.stepsChange.emit(this.steps);
  }

  addStep() {
    this.addStepEvent.emit();
  }

  toList() {
    if (this.stepListComponent) {
      this.stepListComponent.toList();
    }
  }

}
