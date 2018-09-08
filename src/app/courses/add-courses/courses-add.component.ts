import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CoursesService } from '../courses.service';
import { UserService } from '../../shared/user.service';
import { uniqueId } from '../../shared/utils';

@Component({
  templateUrl: 'courses-add.component.html',
  styleUrls: [ './courses-add.scss' ]
})
export class CoursesAddComponent implements OnInit, OnDestroy {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;
  documentInfo = { rev: '', id: '' };
  pageType = 'Add new';
  private onDestroy$ = new Subject<void>();
  private _steps = [];
  get steps() {
    return this._steps;
  }
  set steps(value: any[]) {
    this._steps = value;
    this.coursesService.course = { form: this.courseForm.value, steps: this._steps };
  }

  currentStepChecked: boolean;

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;

  mockStep = { stepTitle: 'Add title', description: '!!!' };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService,
    private userService: UserService
  ) {
    this.createForm();
    this.onFormChanges();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
        ? ac => this.validatorService.isNameAvailible$(this.dbName, 'courseTitle', ac, this.route.snapshot.params.id)
        : ac => this.validatorService.isUnique$(this.dbName, 'courseTitle', ac)
      ],
      description: [ '', Validators.required ],
      languageOfInstruction: '',
      memberLimit: [
        10, // need to compose validators if we use more than one
        Validators.compose([
          CustomValidators.integerValidator,
          CustomValidators.positiveNumberValidator
        ])
      ],
      method: '',
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      createdDate: Date.now(),
      creator: this.userService.get().name + '@' + this.userService.getConfig().code,
      sourcePlanet: this.userService.getConfig().code,
      resideOn: this.userService.getConfig().code,
      updatedDate: Date.now()
    });
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('courses/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        data.steps.forEach(step => {
          step['id'] = uniqueId();
        });
        this.pageType = 'Update';
        this.documentInfo = { rev: data._rev, id: data._id };
        if (this.route.snapshot.params.continue !== 'true') {
          this.setFormAndSteps({ form: data, steps: data.steps });
        }
      }, (error) => {
        console.log(error);
      });
    }
    if (this.route.snapshot.params.continue === 'true') {
      this.setFormAndSteps(this.coursesService.course);
    }
    const returnRoute = this.router.createUrlTree([ '.', { continue: true } ], { relativeTo: this.route });
    this.coursesService.returnUrl = this.router.serializeUrl(returnRoute);
    this.coursesService.course = { form: this.courseForm.value, steps: this.steps };
  }

  ngOnDestroy() {
    if (this.coursesService.stepIndex === undefined) {
      this.coursesService.reset();
    }
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setFormAndSteps(course: any) {
    this.courseForm.patchValue(course.form);
    this.steps = course.steps || [];
  }

  onFormChanges() {
    this.courseForm.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(value => {
      this.coursesService.course = { form: value, steps: this.steps };
    });
  }

  updateCourse(courseInfo) {
    this.deleteStepIdProperty();
    this.couchService.put(
      this.dbName + '/' + this.documentInfo.id,
      { ...courseInfo, '_rev': this.documentInfo.rev, steps: this.steps, updatedDate: Date.now() }
    ).subscribe(() => {
      this.navigateBack();
      this.planetMessageService.showMessage('Course Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      if (this.route.snapshot.url[0].path === 'update') {
        this.updateCourse(this.courseForm.value);
      } else {
        this.addCourse(this.courseForm.value);
      }
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addCourse(courseInfo) {
    // ...is the rest syntax for object destructuring
    // By deleting the id property, ngFor trackBy will break
    // If user is not rerouted after update moving steps will no longer work
    this.deleteStepIdProperty();
    this.couchService.post(this.dbName, { ...courseInfo, steps: this.steps }).subscribe(() => {
      this.navigateBack();
      this.planetMessageService.showMessage('New Course Added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  deleteStepIdProperty() {
    this.steps.forEach(step => {
      delete step.id;
    });
  }

  addStep() {
    this.steps.push({
      id: uniqueId(),
      stepTitle: '',
      description: '',
      resources: []
    });
  }

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

  removeStep(pos) {
    this.steps.splice(pos, 1);
  }

  orderStep(oldPos, newPos) {
    const tempStep = this.steps[oldPos];
    this.steps.splice(oldPos, 1);
    this.steps.splice(newPos, 0, tempStep);
  }

  stepTrackByFn(index, item) {
    return item.id;
  }

  checkStep(event: boolean) {
    event === false ? this.currentStepChecked = false : this.currentStepChecked = true;
  }
}
