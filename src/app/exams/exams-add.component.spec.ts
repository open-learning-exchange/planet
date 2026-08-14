import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule, NonNullableFormBuilder, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ExamsAddComponent } from './exams-add.component';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CoursesService } from '../courses/courses.service';
import { ExamsService } from './exams.service';
import { PlanetStepListService } from '../shared/forms/planet-step-list.component';
import { SubmissionsService } from '../submissions/submissions.service';

describe('ExamsAddComponent Retake Policies', () => {
  let component: ExamsAddComponent;
  let fixture: ComponentFixture<ExamsAddComponent>;

  const couchServiceMock = {
    get: vi.fn().mockReturnValue(of({ name: 'Test Exam', questions: [], maxAttempts: 3, retakeCooloffHours: 24 })),
    findAll: vi.fn().mockReturnValue(of([])),
    updateDocument: vi.fn().mockReturnValue(of({ id: 'exam_1', rev: '1-rev' }))
  };

  const validatorServiceMock = {
    isUnique$: vi.fn().mockReturnValue(of(null))
  };

  const planetMessageServiceMock = {
    showMessage: vi.fn(),
    showAlert: vi.fn()
  };

  const coursesServiceMock = {
    course: { form: { courseTitle: 'Sample Course' }, steps: [{}] },
    stepIndex: 0,
    returnUrl: 'courses'
  };

  const submissionsServiceMock = {
    getSubmissions: vi.fn().mockReturnValue(of([]))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        FormsModule,
        BrowserAnimationsModule,
        ExamsAddComponent
      ],
      providers: [
        { provide: NonNullableFormBuilder, useValue: new FormBuilder().nonNullable },
        { provide: CouchService, useValue: couchServiceMock },
        { provide: ValidatorService, useValue: validatorServiceMock },
        { provide: PlanetMessageService, useValue: planetMessageServiceMock },
        { provide: CoursesService, useValue: coursesServiceMock },
        { provide: ExamsService, useValue: {
          newQuestionForm: vi.fn().mockReturnValue({}),
          updateQuestion: vi.fn(),
          checkValidFormComponent: vi.fn(),
          createExamDocument: vi.fn().mockReturnValue(of({ id: 'exam_1', rev: '1-rev' }))
        } },
        { provide: PlanetStepListService, useValue: {
          addStep: vi.fn(),
          stepMoveClick$: of({}),
          stepAdded$: of({})
        } },
        { provide: MatDialog, useValue: { open: vi.fn(), openDialogs: [] } },
        { provide: SubmissionsService, useValue: submissionsServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'type' ? 'exam' : 'exam_1') },
              url: [{ path: 'add' }],
              data: {}
            },
            parent: null
          }
        },
        {
          provide: Router,
          useValue: {
            url: '/courses/exam;type=exam',
            navigate: vi.fn(),
            navigateByUrl: vi.fn()
          }
        }
      ]
    });
    fixture = TestBed.createComponent(ExamsAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize maxAttempts, retakeCooloffHours, and retakeCooloffMinutes with 0 by default', () => {
    expect(component.examForm.controls.maxAttempts.value).toBe(0);
    expect(component.examForm.controls.retakeCooloffHours.value).toBe(0);
    expect(component.examForm.controls.retakeCooloffMinutes.value).toBe(0);
  });

  it('should validate that maxAttempts and retakeCooloffMinutes cannot be negative', () => {
    component.examForm.controls.maxAttempts.setValue(-1);
    expect(component.examForm.controls.maxAttempts.valid).toBe(false);

    component.examForm.controls.maxAttempts.setValue(3);
    expect(component.examForm.controls.maxAttempts.valid).toBe(true);

    component.examForm.controls.retakeCooloffMinutes.setValue(-5);
    expect(component.examForm.controls.retakeCooloffMinutes.valid).toBe(false);

    component.examForm.controls.retakeCooloffMinutes.setValue(90);
    expect(component.examForm.controls.retakeCooloffMinutes.valid).toBe(true);
  });

  it('should append maxAttempts, retakeCooloffHours, and retakeCooloffMinutes to course step on appendToCourse', () => {
    component.examForm.controls.maxAttempts.setValue(5);
    component.examForm.controls.retakeCooloffHours.setValue(48);
    component.examForm.controls.retakeCooloffMinutes.setValue(2880);

    const examInfo: any = {
      name: 'Test Exam',
      description: '',
      passingPercentage: 100,
      questions: [],
      type: 'courses',
      teamShareAllowed: false,
      maxAttempts: 5,
      retakeCooloffHours: 48,
      retakeCooloffMinutes: 2880
    };

    component.appendToCourse(examInfo, 'exam');
    const savedExam = coursesServiceMock.course.steps[0].exam;
    expect(savedExam.maxAttempts).toBe(5);
    expect(savedExam.retakeCooloffHours).toBe(48);
    expect(savedExam.retakeCooloffMinutes).toBe(2880);
  });

  it('should open RetakePolicyDialog and update form values on close', () => {
    const dialogSpy = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => of({ maxAttempts: 4, retakeCooloffMinutes: 150 })
    } as any);

    component.openRetakePolicyDialog();
    expect(dialogSpy).toHaveBeenCalled();
    expect(component.examForm.controls.maxAttempts.value).toBe(4);
    expect(component.examForm.controls.retakeCooloffMinutes.value).toBe(150);
    expect(component.examForm.controls.retakeCooloffHours.value).toBe(2.5);
  });
});
