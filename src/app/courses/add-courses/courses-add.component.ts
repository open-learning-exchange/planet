import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of, combineLatest, race, interval } from 'rxjs';
import { takeWhile, debounce, catchError, switchMap } from 'rxjs/operators';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CoursesService } from '../courses.service';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { PlanetStepListService } from '../../shared/forms/planet-step-list.component';
import { PouchService } from '../../shared/database';
import { debug } from '../../debug-operator';
import { TagsService } from '../../shared/forms/tags.service';

@Component({
  templateUrl: 'courses-add.component.html',
  styleUrls: [ './courses-add.scss' ]
})
export class CoursesAddComponent implements OnInit, OnDestroy {

  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;
  documentInfo = { '_rev': undefined, '_id': undefined };
  courseId = this.route.snapshot.paramMap.get('id') || undefined;
  pageType = 'Add new';
  tags = this.fb.control([]);
  private onDestroy$ = new Subject<void>();
  private isDestroyed = false;
  private stepsChange$ = new Subject<any[]>();
  private _steps = [];
  get steps() {
    return this._steps;
  }
  set steps(value: any[]) {
    this._steps = value;
    this.coursesService.course = { form: this.courseForm.value, steps: this._steps };
    this.stepsChange$.next(value);
  }

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
    private userService: UserService,
    private stateService: StateService,
    private planetStepListService: PlanetStepListService,
    private pouchService: PouchService,
    private tagsService: TagsService
  ) {
    this.createForm();
    this.onFormChanges();
  }

  createForm() {
    const configuration = this.stateService.configuration;
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        CustomValidators.required,
        this.courseTitleValidator(this.courseId || this.coursesService.course._id)
      ],
      description: [ '', CustomValidators.required ],
      languageOfInstruction: '',
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      createdDate: this.couchService.datePlaceholder,
      creator: this.userService.get().name + '@' + configuration.code,
      sourcePlanet: configuration.code,
      resideOn: configuration.code,
      updatedDate: this.couchService.datePlaceholder
    });
  }

  courseTitleValidator(id: string = '') {
    return ac => this.validatorService.isUnique$(this.dbName, 'courseTitle', ac, { selectors: { '_id': { '$ne': id } } });
  }

  ngOnInit() {
    forkJoin([
      this.pouchService.getDocEditing(this.dbName, this.courseId),
      this.couchService.get('courses/' + this.courseId).pipe(catchError((err) => of(err.error))),
      this.stateService.getCouchState('tags', 'local')
    ]).subscribe(([ draft, saved, tags ]: [ any, any, any[] ]) => {
      if (saved.error !== 'not_found') {
        this.documentInfo = { _rev: saved._rev, _id: saved._id };
        this.pageType = 'Update';
      }
      const doc = draft === undefined ? saved : draft;
      this.setInitialTags(tags, this.documentInfo, draft);
      if (this.route.snapshot.params.continue !== 'true') {
        this.setFormAndSteps({ form: doc, steps: doc.steps, tags: doc.tags, initialTags: this.coursesService.course.initialTags });
      }
    });
    if (this.route.snapshot.params.continue === 'true') {
      this.documentInfo = { '_rev': this.coursesService.course._rev, '_id': this.coursesService.course._id };
      this.setFormAndSteps(this.coursesService.course);
      this.submitAddedExam();
    }
    const returnRoute = this.router.createUrlTree([ '.', { continue: true } ], { relativeTo: this.route });
    this.coursesService.returnUrl = this.router.serializeUrl(returnRoute);
    this.coursesService.course = { form: this.courseForm.value, steps: this.steps };
    this.coursesService.stepIndex = undefined;
  }

  ngOnDestroy() {
    if (this.coursesService.stepIndex === undefined) {
      this.coursesService.reset();
    }
    this.isDestroyed = true;
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  submitAddedExam() {
    setTimeout(() => {
      if (!this.courseForm.pending) {
        this.onSubmit(false);
      } else {
        this.submitAddedExam();
      }
    }, 1000);
  }

  setFormAndSteps(course: any) {
    this.courseForm.patchValue(course.form);
    this.steps = course.steps || [];
    this.tags.setValue(course.tags || (course.initialTags || []).map((tag: any) => tag._id));
  }

  setInitialTags(tags, documentInfo, draft?) {
    if (this.isDestroyed) {
      return;
    }
    const courseTags = documentInfo._id ? this.tagsService.attachTagsToDocs(this.dbName, [ documentInfo ], tags)[0].tags : [];
    this.coursesService.course = { initialTags: courseTags || [] };
    this.tags.setValue(draft === undefined ? this.coursesService.course.initialTags.map((tag: any) => tag._id) : draft.tags);
  }

  onFormChanges() {
    combineLatest(this.courseForm.valueChanges, this.stepsChange$, this.tags.valueChanges).pipe(
      debounce(() => race(interval(2000), this.onDestroy$)),
      takeWhile(() => this.isDestroyed === false, true)
    ).subscribe(([ value, steps, tags ]) => {
      this.coursesService.course = { form: value, steps, tags };
      this.pouchService.saveDocEditing(
        { ...value, steps, tags, initialTags: this.coursesService.course.initialTags }, this.dbName, this.courseId
      );
    });
  }

  updateCourse(courseInfo, shouldNavigate) {
    if ((courseInfo.createdDate).constructor === Object) {
      courseInfo.createdDate = this.couchService.datePlaceholder;
    }
    this.couchService.updateDocument(
      this.dbName,
      { ...courseInfo, steps: this.steps, updatedDate: this.couchService.datePlaceholder, ...this.documentInfo }
    ).pipe(switchMap((res: any) =>
      forkJoin([
        of(res),
        this.couchService.bulkDocs(
          'tags',
          this.tagsService.tagBulkDocs(res.id, this.dbName, this.tags.value, this.coursesService.course.initialTags)
        )
      ])
    )).subscribe(([ courseRes, tagsRes ]) => {
      const message = courseInfo.courseTitle + (this.pageType === 'Update' ? ' Updated Successfully' : ' Added');
      this.courseChangeComplete(message, courseRes, shouldNavigate);
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  onSubmit(shouldNavigate = true) {
    if (this.courseForm.valid) {
      this.updateCourse(this.courseForm.value, shouldNavigate);
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  courseChangeComplete(message, response: any, shouldNavigate) {
    this.pouchService.deleteDocEditing(this.dbName, this.courseId);
    if (shouldNavigate) {
      this.navigateBack();
    }
    this.planetMessageService.showMessage(message);
    if (this.isDestroyed) {
      return;
    }
    this.courseForm.get('courseTitle').setAsyncValidators(this.courseTitleValidator(response.id));
    this.courseId = response.id;
    this.documentInfo = { '_id': response.id, '_rev': response.rev };
    this.stateService.getCouchState('tags', 'local').subscribe((tags) => this.setInitialTags(tags, this.documentInfo));
    this.coursesService.course = { ...this.documentInfo };
  }

  addStep() {
    this.steps.push({
      stepTitle: '',
      description: '',
      resources: []
    });
    this.planetStepListService.addStep(this.steps.length - 1);
  }

  cancel() {
    this.pouchService.deleteDocEditing(this.dbName, this.courseId);
    this.navigateBack();
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

}
