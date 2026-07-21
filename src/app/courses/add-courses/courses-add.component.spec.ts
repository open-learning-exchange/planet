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
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MatDialog } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';

describe('CoursesAddComponent', () => {
  let component: CoursesAddComponent;
  let fixture: ComponentFixture<CoursesAddComponent>;
  let couchService;
  let testCourseForm;
  let de;
  let postSpy: any;

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
    couchService = fixture.debugElement.injector.get(CouchService);
    de = fixture.debugElement;
    postSpy = fixture.debugElement.injector.get(CouchService);
    testCourseForm = { courseTitle: 'OLE Test 1', description: 'First test for VIs' };

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // test createForm()
  it('should createForm', () => {
    expect(component.createForm()).toBe(undefined);
  });

  // test onSubmit()
  it('should onSubmit', () => {
    component.onSubmit();
    expect(component.courseForm.controls.courseTitle.hasError('required')).toBe(true);
  });

  // test cancel()
  it('should cancel', () => {
    expect(component.cancel()).toBe(undefined);
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
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({ close: vi.fn() } as any);
    component.draftExists = true;
    component.deleteDraft();
    expect(openSpy).toHaveBeenCalledWith(DialogsPromptComponent, expect.objectContaining({
      data: expect.objectContaining({
        changeType: 'delete',
        type: 'course'
      })
    }));
  });
});
