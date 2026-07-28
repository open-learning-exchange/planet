import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of, combineLatest, race, interval, from } from 'rxjs';
import { takeWhile, debounce, catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
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
import { CoursesStepComponent } from './courses-step.component';
import { PouchService } from '../../shared/database/pouch.service';
import { TagsService } from '../../shared/forms/tags.service';
import { showFormErrors } from '../../shared/table-helpers';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormErrorMessagesComponent } from '../../shared/forms/form-error-messages.component';
import { PlanetMarkdownTextboxComponent } from '../../shared/forms/planet-markdown-textbox.component';
import { MatAutocompleteTrigger, MatAutocomplete, MatOption } from '@angular/material/autocomplete';
import { MatSelect } from '@angular/material/select';
import { PlanetTagInputComponent } from '../../shared/forms/planet-tag-input.component';
import { SubmitDirective } from '../../shared/submit.directive';
import { FileUploadComponent, AttachmentInputState, ExistingAttachment } from '../../shared/forms/file-upload.component';
import { couchAttachmentUrl, normalizeImage, NormalizedImage } from '../../shared/utils';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { TruncateTextPipe } from '../../shared/truncate-text.pipe';

interface CourseFormModel {
  courseTitle: FormControl<string>;
  description: FormControl<string>;
  languageOfInstruction: FormControl<string>;
  gradeLevel: FormControl<string>;
  subjectLevel: FormControl<string>;
  createdDate: FormControl<DateValue>;
  creator: FormControl<string>;
  sourcePlanet: FormControl<string>;
  resideOn: FormControl<string>;
  updatedDate: FormControl<DateValue>;
}

type DateValue = number | string | CouchService['datePlaceholder'];

@Component({
  templateUrl: 'courses-add.component.html',
  styleUrls: ['./courses-add.scss'],
  imports: [
    MatToolbar, MatIconAnchor, MatIcon, ReactiveFormsModule, MatFormField,
    MatLabel, MatInput, MatError, FormErrorMessagesComponent, PlanetMarkdownTextboxComponent,
    MatAutocompleteTrigger, MatAutocomplete, MatOption, MatSelect, PlanetTagInputComponent,
    CoursesStepComponent, MatButton, FileUploadComponent, SubmitDirective,
    MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, TruncateTextPipe
  ]
})
export class CoursesAddComponent implements OnInit, OnDestroy {

  readonly dbName = 'courses'; // make database name a constant
  private onDestroy$ = new Subject<void>();
  private isDestroyed = false;
  private isSaved = false;
  private stepsChange$ = new Subject<any[]>();
  private initialState = '';
  private _steps = [];
  private preserveCoverStateUntilSubmit = false;
  existingCoverAttachments: ExistingAttachment[] = [];
  private coverState: AttachmentInputState = { retained: [], removed: [], added: [] };
  savedCourse: any = null;
  draftExists: boolean;
  courseForm: FormGroup<CourseFormModel>;
  documentInfo = { '_rev': undefined, '_id': undefined };
  courseId = this.route.snapshot.paramMap.get('id') || undefined;
  pageType: string | null = null;
  isFormExpanded = true;
  submitAttempted = false;
  newCourseLabel = $localize`New Course`;
  tags = this.fb.control<string[]>([]);
  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  images: any[] = [];
  // from the languages import
  languageNames = languages.map(list => list.name);
  @ViewChild(CoursesStepComponent) coursesStepComponent: CoursesStepComponent;
  @ViewChild(FileUploadComponent) coverUploadComponent?: FileUploadComponent;
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: NonNullableFormBuilder,
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

  ngOnInit() {
    const continued = this.route.snapshot.params.continue === 'true' && Object.keys(this.coursesService.course).length;
    const continuedCourse = continued ? { ...this.coursesService.course } : null;
    const continuedCoverState = continuedCourse?.coverState;
    forkJoin([
      this.pouchService.getDocEditing(this.dbName, this.courseId),
      this.couchService.get('courses/' + this.courseId).pipe(catchError((err) => of(err.error))),
      this.stateService.getCouchState('tags', 'local')
    ]).subscribe(([ draft, saved, tags ]: [ any, any, any[] ]) => {
      if (saved.error !== 'not_found') {
        this.setDocumentInfo(saved);
        this.savedCourse = saved;
        if (!continuedCoverState) {
          this.setExistingCover(saved);
        }
        this.pageType = 'Edit';
        this.isFormExpanded = !(saved.steps && saved.steps.length > 0);
      } else {
        this.pageType = 'Add';
        this.savedCourse = null;
        this.isFormExpanded = true;
      }
      this.draftExists = draft !== undefined;
      const doc = draft === undefined ? saved : draft;
      this.setInitialTags(tags, this.documentInfo, draft);
      if (continued) {
        this.preserveCoverStateUntilSubmit = !!continuedCoverState;
        this.setFormAndSteps(continuedCourse);
        this.setCoverState(continuedCoverState || this.coverState);
        this.submitAddedExam();
      } else {
        this.setFormAndSteps({ form: doc, steps: doc.steps, tags: doc.tags, initialTags: this.coursesService.course.initialTags });
        this.setInitialState();
      }
    });
    const returnRoute = this.router.createUrlTree([ '.', { continue: true } ], { relativeTo: this.route });
    this.coursesService.returnUrl = this.router.serializeUrl(returnRoute);
    if (!continued) {
      this.coursesService.course = { form: this.courseForm.value, steps: this.steps };
    }
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

  setInitialState() {
    this.initialState = JSON.stringify({
      form: this.courseForm.value,
      steps: this.steps,
      tags: this.tags.value
    });
  }

  createForm() {
    const configuration = this.stateService.configuration;
    this.courseForm = this.fb.group<CourseFormModel>({
      courseTitle: this.fb.control('', {
        validators: CustomValidators.required,
        asyncValidators: ac => this.validatorService.isUnique$(
          this.dbName, 'courseTitle', ac, { selectors: { '_id': { '$ne': this.documentInfo._id || '' } } }
        )
      }),
      description: this.fb.control('', { validators: CustomValidators.requiredMarkdown }),
      languageOfInstruction: this.fb.control(''),
      gradeLevel: this.fb.control(''),
      subjectLevel: this.fb.control(''),
      createdDate: this.fb.control<DateValue>(this.couchService.datePlaceholder),
      creator: this.fb.control(this.userService.get().name + '@' + configuration.code),
      sourcePlanet: this.fb.control(configuration.code),
      resideOn: this.fb.control(configuration.code),
      updatedDate: this.fb.control<DateValue>(this.couchService.datePlaceholder)
    });
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
      const currentState = JSON.stringify({
        form: this.courseForm.value,
        steps: this.steps,
        tags: this.tags.value
      });
      // Only auto-save if there are actual changes from the initial state
      if (currentState !== this.initialState) {
        this.pouchService.saveDocEditing({
          ...course, tags: this.tags.value, initialTags: this.coursesService.course.initialTags
        }, this.dbName, this.courseId);
        this.draftExists = true;
        this.setInitialState();
      }
    });
  }

  onCoverStateChange(state: AttachmentInputState) {
    if (this.preserveCoverStateUntilSubmit) {
      this.preserveCoverStateUntilSubmit = false;
      return;
    }
    this.setCoverState(state);
  }

  setCoverState(state: AttachmentInputState) {
    this.coverState = state;
    this.coursesService.course = { coverState: state };
  }

  setExistingCover(course: any) {
    const fileName = course.coverFileName;
    const attachment = course._attachments?.[fileName];
    this.existingCoverAttachments = fileName && attachment ? [ {
      name: fileName,
      contentType: attachment.content_type,
      url: couchAttachmentUrl(environment.couchAddress, this.dbName, course._id, fileName)
    } ] : [];
    // Seed cover state directly so a save can't drop the cover if it fires before the upload child emits.
    this.setCoverState({ retained: [ ...this.existingCoverAttachments ], removed: [], added: [] });
  }

  updateCourse(courseInfo: FormGroup<CourseFormModel>['value'], shouldNavigate: boolean) {
    if (courseInfo.createdDate.constructor === Object) {
      courseInfo.createdDate = this.couchService.datePlaceholder;
    }
    const newCourse: any = {
      ...this.convertMarkdownImagesText({ ...courseInfo, images: this.images }, this.steps),
      ...this.documentInfo
    };
    const addedCover = this.coverState?.added[0];
    const retainedCover = this.coverState?.retained[0];
    const existingAttachmentNames = Object.keys(this.savedCourse?._attachments || {});
    (addedCover ? from(normalizeImage(addedCover.file, { usedNames: existingAttachmentNames })) : of(null)).pipe(
      switchMap(normalizedCover => {
        if (normalizedCover) {
          return this.saveCourseWithNewCover(newCourse, normalizedCover);
        }
        if (retainedCover && this.savedCourse?._attachments?.[retainedCover.name]) {
          newCourse.coverFileName = retainedCover.name;
          newCourse._attachments = { ...this.savedCourse._attachments };
        } else {
          const attachments = { ...(this.savedCourse?._attachments || {}) };
          if (this.savedCourse?.coverFileName) {
            delete attachments[this.savedCourse.coverFileName];
          }
          delete newCourse.coverFileName;
          if (Object.keys(attachments).length) {
            newCourse._attachments = attachments;
          }
        }
        return this.saveCourseDocument(newCourse);
      })
    ).subscribe(([ courseRes ]) => {
      const message = (this.pageType === 'Edit' ? $localize`Edited course: ` : $localize`Added course: `) + courseInfo.courseTitle;
      this.courseChangeComplete(message, courseRes, shouldNavigate);
      this.preserveCoverStateUntilSubmit = false;
    }, (err) => {
      this.preserveCoverStateUntilSubmit = false;
      this.planetMessageService.showAlert($localize`There was an error saving this course`);
    });
  }

  private saveCourseDocument(course: any) {
    return this.couchService.updateDocument(
      this.dbName, { ...course, updatedDate: this.couchService.datePlaceholder }
    ).pipe(switchMap((res: any) =>
      forkJoin([
        of(res),
        this.couchService.bulkDocs(
          'tags',
          this.tagsService.tagBulkDocs(res.id, this.dbName, this.tags.value, this.coursesService.course.initialTags)
        )
      ])
    )
    );
  }

  private saveCourseWithNewCover(course: any, normalizedCover: NormalizedImage) {
    const existingCourseId = this.documentInfo._id;
    const existingCourseRev = this.documentInfo._rev;
    const courseWithoutCover = { ...course };
    delete courseWithoutCover.coverFileName;
    const upload$ = existingCourseId && existingCourseRev ?
      this.couchService.putAttachment(
        `${this.dbName}/${existingCourseId}/${normalizedCover.fileName}?rev=${existingCourseRev}`,
        normalizedCover.file, { headers: { 'Content-Type': normalizedCover.contentType } }
      ).pipe(switchMap(() => this.couchService.get(`${this.dbName}/${existingCourseId}`))) :
      this.couchService.updateDocument(
        this.dbName, { ...courseWithoutCover, updatedDate: this.couchService.datePlaceholder }
      ).pipe(
        switchMap((res: any) => this.couchService.putAttachment(
          `${this.dbName}/${res.id}/${normalizedCover.fileName}?rev=${res.rev}`,
          normalizedCover.file, { headers: { 'Content-Type': normalizedCover.contentType } }
        ).pipe(switchMap(() => this.couchService.get(`${this.dbName}/${res.id}`))))
      );
    return upload$.pipe(switchMap((uploadedDoc: any) => {
      const attachments = { ...(uploadedDoc._attachments || {}) };
      if (this.savedCourse?.coverFileName && this.savedCourse.coverFileName !== normalizedCover.fileName) {
        delete attachments[this.savedCourse.coverFileName];
      }
      return this.saveCourseDocument({
        ...course,
        _id: uploadedDoc._id,
        _rev: uploadedDoc._rev,
        coverFileName: normalizedCover.fileName,
        _attachments: attachments
      });
    }));
  }

  onSubmit(shouldNavigate = true) {
    if (!this.courseForm.valid) {
      this.preserveCoverStateUntilSubmit = false;
      this.submitAttempted = true;
      this.isFormExpanded = true;
      showFormErrors(this.courseForm.controls as unknown as { [key: string]: AbstractControl });
      return;
    }
    this.updateCourse(this.courseForm.getRawValue(), shouldNavigate);
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

  openCourseDetails() {
    this.isFormExpanded = true;
    this.coursesStepComponent?.toList();
  }

  onStepEditorOpenChange(isOpen: boolean) {
    if (isOpen) {
      this.isFormExpanded = false;
    }
  }

  cancel() {
    this.navigateBack();
  }

  deleteDraft() {
    if (!this.draftExists) {
      return;
    }
    this.coverUploadComponent?.clear();
    if (this.savedCourse) {
      this.setFormAndSteps({
        form: this.savedCourse,
        steps: this.savedCourse.steps || [],
        tags: this.savedCourse.tags || []
      });
      this.setExistingCover(this.savedCourse);
    } else {
      this.setFormAndSteps({
        form: { courseTitle: '', description: '', languageOfInstruction: '', gradeLevel: '', subjectLevel: '' },
        steps: [],
        tags: []
      });
      this.existingCoverAttachments = [];
      this.setCoverState({ retained: [], removed: [], added: [] });
    }
    this.coursesStepComponent.toList();
    this.setInitialState();
    this.pouchService.deleteDocEditing(this.dbName, this.courseId);
    this.courseForm.markAsPristine();
    this.draftExists = false;
    this.planetMessageService.showMessage($localize`:@@draftDiscardedMessage:Draft discarded`);
  }

  navigateBack() {
    const relativeRoute = (urlArray: string[]) => {
      const lastIndex = urlArray.length - 1;
      const endConditions = [ 'update', 'add' ];
      // Strip matrix params (e.g. ";continue=true" set when returning from the exam/survey builder)
      const segment = urlArray[lastIndex].split(';')[0];
      return `../${
        (lastIndex === 1 || endConditions.indexOf(segment) > -1) ? '' : relativeRoute(urlArray.slice(0, lastIndex))
      }`;
    };
    this.router.navigate([ relativeRoute(this.router.url.split('/')) ], { relativeTo: this.route });
  }

  removeStep(pos) {
    this.steps.splice(pos, 1);
  }

  convertMarkdownImagesText(course, steps) {
    return { ...this.coursesService.storeMarkdownImages({ ...course, steps }) };
  }

}
