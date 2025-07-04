import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of, combineLatest, race, interval } from 'rxjs';
import { takeWhile, debounce, catchError, switchMap } from 'rxjs/operators';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { languages } from '../../shared/languages';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CoursesService } from '../courses.service';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { PlanetStepListService } from '../../shared/forms/planet-step-list.component';
import { PouchService } from '../../shared/database/pouch.service';
import { TagsService } from '../../shared/forms/tags.service';
import { showFormErrors } from '../../shared/table-helpers';
import { CanComponentDeactivate } from '../../shared/unsaved-changes.guard';

@Component({
  templateUrl: 'courses-add.component.html',
  styleUrls: [ './courses-add.scss' ]
})
export class CoursesAddComponent implements OnInit, OnDestroy, CanComponentDeactivate {

  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;
  documentInfo = { '_rev': undefined, '_id': undefined };
  courseId = this.route.snapshot.paramMap.get('id') || undefined;
  pageType: string | null = null;
  tags = this.fb.control([]);
  private onDestroy$ = new Subject<void>();
  private isDestroyed = false;
  private isSaved = false;
  private stepsChange$ = new Subject<any[]>();
  private navigationViaCancel = false;
  hasUnsavedChanges = false;
  private initialState = '';
  private _steps = [];
  isFormExpanded = true;
  get steps() {
    return this._steps;
  }
  set steps(value: any[]) {
    this._steps = value.map(step => ({
      ...step,
      description: step.description?.text ?? step.description ?? '',
      images: [ ...(step.description?.images ?? []), ...(step.images || []) ]
    }));
    this.coursesService.course = { form: this.courseForm.value, steps: this._steps };
    this.stepsChange$.next(value);
  }

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  images: any[] = [];

  // from the languages import
  languageNames = languages.map(list => list.name);

  mockStep = { stepTitle: $localize`Add title`, description: '!!!' };

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
        ac => this.validatorService.isUnique$(
          this.dbName, 'courseTitle', ac, { selectors: { '_id': { '$ne': this.documentInfo._id || '' } } }
        )
      ],
      description: [ '', CustomValidators.requiredMarkdown ],
      languageOfInstruction: '',
      gradeLevel: '',
      subjectLevel: '',
      createdDate: this.couchService.datePlaceholder,
      creator: this.userService.get().name + '@' + configuration.code,
      sourcePlanet: configuration.code,
      resideOn: configuration.code,
      updatedDate: this.couchService.datePlaceholder
    });
  }

  ngOnInit() {
    const continued = this.route.snapshot.params.continue === 'true' && Object.keys(this.coursesService.course).length;
    forkJoin([
      this.pouchService.getDocEditing(this.dbName, this.courseId),
      this.couchService.get('courses/' + this.courseId).pipe(catchError((err) => of(err.error))),
      this.stateService.getCouchState('tags', 'local')
    ]).subscribe(([ draft, saved, tags ]: [ any, any, any[] ]) => {
      if (saved.error !== 'not_found') {
        this.setDocumentInfo(saved);
        this.pageType = 'Edit';
        if (saved.steps && saved.steps.length > 0) {
          this.isFormExpanded = false;
        }
      } else {
        this.pageType = 'Add';
        this.isFormExpanded = true;
      }
      const doc = draft === undefined ? saved : draft;
      this.setInitialTags(tags, this.documentInfo, draft);
      if (!continued) {
        this.setFormAndSteps({ form: doc, steps: doc.steps, tags: doc.tags, initialTags: this.coursesService.course.initialTags });
        this.initialState = JSON.stringify({
          form: this.courseForm.value,
          steps: this.steps,
          tags: this.tags.value
        });
      }
    });
    if (continued) {
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

  setDocumentInfo(doc) {
    this.documentInfo = { '_id': doc._id, '_rev': doc._rev };
    this.courseForm.controls.courseTitle.updateValueAndValidity();
  }

  setFormAndSteps(course: any) {
    this.courseForm.patchValue(course.form);
    this.images = course.form.images || [];
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
    combineLatest([
      this.courseForm.valueChanges,
      this.stepsChange$,
      this.tags.valueChanges
    ]).pipe(
      debounce(() => race(interval(200), this.onDestroy$)),
      takeWhile(() => this.isDestroyed === false, true)
    ).subscribe(([ value, steps, tags ]) => {
      if (this.isSaved) {
        return;
      }
      const course = this.convertMarkdownImagesText({ ...value, images: this.images }, steps);
      this.coursesService.course = { form: course, steps: course.steps, tags };
      this.pouchService.saveDocEditing(
        { ...course, tags, initialTags: this.coursesService.course.initialTags },
        this.dbName,
        this.courseId
      );
      const currentState = JSON.stringify({
        form: this.courseForm.value,
        steps: this.steps,
        tags: this.tags.value
      });
      this.hasUnsavedChanges = currentState !== this.initialState;
    });
  }

  updateCourse(courseInfo, shouldNavigate) {
    if (courseInfo.createdDate.constructor === Object) {
      courseInfo.createdDate = this.couchService.datePlaceholder;
    }
    const newCourse = { ...this.convertMarkdownImagesText({ ...courseInfo, images: this.images }, this.steps), ...this.documentInfo };
    this.couchService.updateDocument(
      this.dbName, { ...newCourse, updatedDate: this.couchService.datePlaceholder }
    ).pipe(switchMap((res: any) =>
      forkJoin([
        of(res),
        this.couchService.bulkDocs(
          'tags',
          this.tagsService.tagBulkDocs(res.id, this.dbName, this.tags.value, this.coursesService.course.initialTags)
        )
      ])
    )).subscribe(([ courseRes, tagsRes ]) => {
      const message = (this.pageType === 'Edit' ? $localize`Edited course: ` : $localize`Added course: `) + courseInfo.courseTitle;
      this.courseChangeComplete(message, courseRes, shouldNavigate);
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  onSubmit(shouldNavigate = true) {
    if (!this.courseForm.valid) {
      showFormErrors(this.courseForm.controls);
      return;
    }
    this.updateCourse(this.courseForm.value, shouldNavigate);
  }

  courseChangeComplete(message, response: any, shouldNavigate) {
    this.pouchService.deleteDocEditing(this.dbName, this.courseId);
    this.isSaved = true;
    this.planetMessageService.showMessage(message);
    if (shouldNavigate) {
      this.navigateBack();
      return;
    }
    if (this.isDestroyed) {
      return;
    }
    this.isSaved = false;
    this.courseId = response.id;
    this.setDocumentInfo(response.doc);
    this.stateService.getCouchState('tags', 'local').subscribe((tags) => this.setInitialTags(tags, this.documentInfo));
    this.coursesService.course = { ...this.documentInfo };
    if (this.pageType === 'Add') {
      this.router.navigate([ '../update/', this.courseId ], { relativeTo: this.route, replaceUrl: true });
    }
  }

  addStep() {
    this.steps.push({
      stepTitle: '',
      description: '',
      resources: [],
      images: []
    });
    this.planetStepListService.addStep(this.steps.length - 1);
  }

  cancel() {
    this.navigationViaCancel = true;
    if (this.hasUnsavedChanges) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmCancel) {
        this.navigationViaCancel = false;
        return;
      }
    }
    this.pouchService.deleteDocEditing(this.dbName, this.courseId);
    this.navigateBack();
  }

  canDeactivate(): boolean {
    if (this.navigationViaCancel) {
      return true;
    }
    return true;
  }

  navigateBack() {
    const relativeRoute = (urlArray: string[]) => {
      const lastIndex = urlArray.length - 1;
      const endConditions = [ 'update', 'add' ];
      return `../${
        (lastIndex === 1 || endConditions.indexOf(urlArray[lastIndex]) > -1) ? '' : relativeRoute(urlArray.slice(0, lastIndex))
      }`;
    };
    this.router.navigate([ relativeRoute(this.router.url.split('/')) ], { relativeTo: this.route });
  }

  removeStep(pos) {
    this.steps.splice(pos, 1);
  }

  stepTrackByFn(index, item) {
    return item.id;
  }

  convertMarkdownImagesText(course, steps) {
    return { ...this.coursesService.storeMarkdownImages({ ...course, steps }) };
  }

}
