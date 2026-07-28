import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesAddComponent } from './courses-add.component';
import { FormErrorMessagesComponent } from '../../shared/forms/form-error-messages.component';
import { ValidatorService } from '../../validators/validator.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { MaterialModule } from '../../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { MatDialog } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';
import { PouchService } from '../../shared/database/pouch.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

describe('CoursesAddComponent', () => {
  let component: CoursesAddComponent;
  let fixture: ComponentFixture<CoursesAddComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, RouterTestingModule.withRoutes([
        { path: 'courses', component: CoursesAddComponent }
      ]), MaterialModule, BrowserAnimationsModule, CoursesAddComponent, FormErrorMessagesComponent],
      providers: [
        CouchService,
        ValidatorService,
        provideHttpClient(withInterceptorsFromDi()),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => undefined },
              params: {}
            }
          }
        },
        {
          provide: Router,
          useValue: {
            url: '/courses/add',
            createUrlTree: vi.fn().mockReturnValue({}),
            serializeUrl: vi.fn().mockReturnValue('/courses/add;continue=true'),
            navigate: vi.fn()
          }
        }
      ]
    });
    fixture = TestBed.createComponent(CoursesAddComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark the course title as required when an empty form is submitted', () => {
    component.onSubmit();
    expect(component.courseForm.controls.courseTitle.hasError('required')).toBe(true);
  });

  it('should navigate back when cancel is clicked', () => {
    const router = TestBed.inject(Router);
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(
      [ '../' ],
      { relativeTo: TestBed.inject(ActivatedRoute) }
    );
  });

  it('should not open dialog when deleteDraft is called and draftExists is false', () => {
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open');
    component.draftExists = false;
    component.deleteDraft();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should open confirmation dialog when deleteDraft is called and draftExists is true', () => {
    const dialog = TestBed.inject(MatDialog);
    const pouchService = TestBed.inject(PouchService);
    const afterClosed$ = new Subject<void>();
    const dialogRef = { close: vi.fn(), afterClosed: () => afterClosed$ } as any;
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue(dialogRef);
    const deleteDraftSpy = vi.spyOn(pouchService, 'deleteDocEditing').mockImplementation(() => undefined);
    component.courseForm.controls.courseTitle.setValue('Test draft');
    component.draftExists = true;
    component.deleteDraft();
    expect(openSpy).toHaveBeenCalledWith(DialogsPromptComponent, expect.objectContaining({
      data: expect.objectContaining({
        changeType: 'delete',
        type: 'courseDraft',
        displayName: 'Test draft'
      })
    }));
    const config = openSpy.mock.calls[0][1];
    if (config === undefined) {
      throw new Error('Expected the course draft dialog configuration');
    }
    expect(config.data.okClick).toEqual(expect.objectContaining({
      request: expect.anything(),
      onNext: expect.any(Function)
    }));
    expect(component.deleteDialog).toBe(dialogRef);
    afterClosed$.next();
    expect(component.deleteDialog).toBeNull();
    expect(component.draftExists).toBe(true);
    expect(deleteDraftSpy).not.toHaveBeenCalled();
  });

  it('should discard the draft when the confirmation is accepted', () => {
    const dialog = TestBed.inject(MatDialog);
    const dialogRef = { close: vi.fn(), afterClosed: () => new Subject<void>() } as any;
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue(dialogRef);
    const deleteDraftSpy = vi.spyOn(TestBed.inject(PouchService), 'deleteDocEditing').mockImplementation(() => undefined);
    const showMessageSpy = vi.spyOn(TestBed.inject(PlanetMessageService), 'showMessage');
    const coverUpload = { clear: vi.fn() };
    component.coverUploadComponent = coverUpload as any;
    component.coursesStepComponent = { toList: vi.fn() } as any;
    component.courseId = 'new-draft';
    component.existingCoverAttachments = [ {
      name: 'draft-cover.png',
      contentType: 'image/png',
      url: 'draft-cover-url'
    } ];
    component.courseForm.patchValue({
      courseTitle: 'New draft',
      description: 'Draft description'
    });
    component.draftExists = true;

    component.deleteDraft();
    const config = openSpy.mock.calls[0][1];
    if (config === undefined) {
      throw new Error('Expected the course draft dialog configuration');
    }
    config.data.okClick.request.subscribe(config.data.okClick.onNext);

    expect(component.draftExists).toBe(false);
    expect(component.courseForm.controls.courseTitle.value).toBe('');
    expect(component.courseForm.controls.description.value).toBe('');
    expect(component.existingCoverAttachments).toEqual([]);
    expect(coverUpload.clear).toHaveBeenCalled();
    expect(deleteDraftSpy).toHaveBeenCalledWith('courses', component.courseId);
    expect(showMessageSpy).toHaveBeenCalledWith('Draft discarded');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('should restore the saved course when an edited draft is discarded', () => {
    const dialog = TestBed.inject(MatDialog);
    const dialogRef = { close: vi.fn(), afterClosed: () => new Subject<void>() } as any;
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue(dialogRef);
    vi.spyOn(TestBed.inject(PouchService), 'deleteDocEditing').mockImplementation(() => undefined);
    component.coursesStepComponent = { toList: vi.fn() } as any;
    component.savedCourse = {
      _id: 'saved-course',
      courseTitle: 'Saved course',
      description: 'Saved description',
      coverFileName: 'saved-cover.png',
      _attachments: {
        'saved-cover.png': { content_type: 'image/png' }
      },
      steps: [ {
        stepTitle: 'Saved step',
        description: 'Saved step description',
        resources: [],
        images: []
      } ],
      tags: [ 'saved-tag' ]
    };
    component.courseForm.patchValue({
      courseTitle: 'Edited draft',
      description: 'Edited description'
    });
    component.courseForm.markAsDirty();
    component.draftExists = true;

    component.deleteDraft();
    const config = openSpy.mock.calls[0][1];
    if (config === undefined) {
      throw new Error('Expected the course draft dialog configuration');
    }
    config.data.okClick.request.subscribe(config.data.okClick.onNext);

    expect(component.courseForm.controls.courseTitle.value).toBe('Saved course');
    expect(component.courseForm.controls.description.value).toBe('Saved description');
    expect(component.steps[0].stepTitle).toBe('Saved step');
    expect(component.tags.value).toEqual([ 'saved-tag' ]);
    expect(component.existingCoverAttachments).toHaveLength(1);
    expect(component.existingCoverAttachments[0].name).toBe('saved-cover.png');
    expect(component.courseForm.pristine).toBe(true);
  });
});
