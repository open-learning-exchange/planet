import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CoursesProgressLearnerComponent } from './courses-progress-learner.component';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../../shared/user.service';
import { BehaviorSubject } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('CoursesProgressLearnerComponent', () => {
  let component: CoursesProgressLearnerComponent;
  let fixture: ComponentFixture<CoursesProgressLearnerComponent>;
  let progressLearner$: BehaviorSubject<any[]>;
  let submissionsUpdated$: BehaviorSubject<any[]>;
  let mockCoursesService: any;
  let mockSubmissionsService: any;
  let mockUserService: any;

  beforeEach(async () => {
    progressLearner$ = new BehaviorSubject<any[]>([]);
    submissionsUpdated$ = new BehaviorSubject<any[]>([]);

    mockCoursesService = {
      progressLearnerListener$: () => progressLearner$.asObservable(),
      requestCourses: vi.fn()
    };

    mockSubmissionsService = {
      submissionsUpdated$: submissionsUpdated$.asObservable(),
      updateSubmissions: vi.fn()
    };

    mockUserService = {
      get: () => ({ name: 'test_learner', firstName: 'Test', lastName: 'Learner' })
    };

    await TestBed.configureTestingModule({
      imports: [ CoursesProgressLearnerComponent ],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: SubmissionsService, useValue: mockSubmissionsService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoursesProgressLearnerComponent);
    component = fixture.componentInstance;
  });

  it('should create component and render KPI metrics and empty state via km- test hooks', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(mockSubmissionsService.updateSubmissions).toHaveBeenCalled();
    expect(mockCoursesService.requestCourses).toHaveBeenCalled();
    expect(component.isLoading).toBe(true);

    progressLearner$.next([]);
    submissionsUpdated$.next([]);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);

    const enrolledKpi = fixture.debugElement.query(By.css('.km-enrolled-courses-kpi'));
    const avgCompletionKpi = fixture.debugElement.query(By.css('.km-avg-completion-kpi'));
    const totalStepsKpi = fixture.debugElement.query(By.css('.km-total-steps-kpi'));
    const pendingGradingKpi = fixture.debugElement.query(By.css('.km-pending-grading-kpi'));
    const emptyState = fixture.debugElement.query(By.css('.km-empty-state-box'));

    expect(enrolledKpi).toBeTruthy();
    expect(avgCompletionKpi).toBeTruthy();
    expect(totalStepsKpi).toBeTruthy();
    expect(pendingGradingKpi).toBeTruthy();
    expect(emptyState).toBeTruthy();
  });

  it('should process enrolled courses and calculate completion & mistake metrics', () => {
    fixture.detectChanges();
    progressLearner$.next([
      {
        _id: 'course_1',
        doc: {
          _id: 'course_1',
          courseTitle: 'Algebra 101',
          steps: [
            { stepTitle: 'Step 1', exam: { _id: 'exam_1' } },
            { stepTitle: 'Step 2', exam: { _id: 'exam_2' } }
          ]
        },
        progress: [ { user: 'test_learner', stepNum: 2 } ]
      }
    ]);

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_1',
        status: 'complete',
        user: { name: 'test_learner' },
        answers: [ { grade: 1, mistakes: 0 } ]
      },
      {
        _id: 'sub_2',
        parentId: 'exam_2@course_1',
        status: 'complete',
        user: { name: 'test_learner' },
        answers: [ { grade: 1, mistakes: 1 } ]
      }
    ]);

    fixture.detectChanges();

    expect(component.totalCourses).toBe(1);
    expect(component.avgCompletionPercentage).toBe(100);
    expect(component.totalStepsCompleted).toBe(2);
    expect(component.totalErrorsCount).toBe(1);
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].passedStepsCount).toBe(2);

    const progressTable = fixture.debugElement.query(By.css('.km-progress-table'));
    expect(progressTable).toBeTruthy();
  });

  it('should sum retake mistakes across multiple submission attempts for the same step', () => {
    component.ngOnInit();
    progressLearner$.next([
      {
        _id: 'course_1',
        doc: {
          _id: 'course_1',
          courseTitle: 'Biology 101',
          steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
        },
        progress: []
      }
    ]);

    submissionsUpdated$.next([
      {
        _id: 'sub_attempt_1',
        parentId: 'exam_1@course_1',
        status: 'complete',
        user: { name: 'test_learner' },
        answers: [ { grade: 0, mistakes: 2 } ]
      },
      {
        _id: 'sub_attempt_2',
        parentId: 'exam_1@course_1',
        status: 'complete',
        user: { name: 'test_learner' },
        answers: [ { grade: 1, mistakes: 1 } ]
      }
    ]);

    expect(component.totalErrorsCount).toBe(3);
    expect(component.dataSource.data[0].stepStatuses[0].status).toBe('complete');
    expect(component.dataSource.data[0].stepStatuses[0].errors).toBe(3);
  });

  it('should extract educator feedback comments from submission answers', () => {
    component.ngOnInit();
    progressLearner$.next([
      {
        _id: 'course_1',
        doc: {
          _id: 'course_1',
          courseTitle: 'History 101',
          steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
        },
        progress: []
      }
    ]);

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_1',
        status: 'complete',
        user: { name: 'test_learner' },
        comment: 'Great effort overall!',
        answers: [ { grade: 1, mistakes: 0, comment: 'Well detailed essay answer.' } ]
      }
    ]);

    const feedback = component.dataSource.data[0].stepStatuses[0].feedbackList;
    expect(feedback.length).toBe(2);
    expect(feedback[0].comment).toBe('Great effort overall!');
    expect(feedback[1].comment).toBe('Well detailed essay answer.');
  });

  it('should filter table rows based on search input filter', () => {
    component.ngOnInit();
    component.dataSource.data = [
      {
        courseId: 'c1', courseTitle: 'Algebra 101', passedStepsCount: 1,
        totalSteps: 2, completionPercentage: 50, totalErrors: 0,
        pendingGradingCount: 0, lastActive: null, stepStatuses: []
      },
      {
        courseId: 'c2', courseTitle: 'Physics 202', passedStepsCount: 2,
        totalSteps: 2, completionPercentage: 100, totalErrors: 1,
        pendingGradingCount: 0, lastActive: null, stepStatuses: []
      }
    ];

    component.applyFilter('physics');
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].courseTitle).toBe('Physics 202');
  });

  it('should require both exam and survey to be completed before marking step complete', () => {
    component.ngOnInit();
    progressLearner$.next([
      {
        _id: 'course_1',
        doc: {
          _id: 'course_1',
          courseTitle: 'Chemistry 101',
          steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' }, survey: { _id: 'survey_1' } } ]
        },
        progress: []
      }
    ]);

    submissionsUpdated$.next([
      {
        _id: 'sub_exam',
        parentId: 'exam_1@course_1',
        status: 'complete',
        user: { name: 'test_learner' },
        answers: [ { grade: 1, mistakes: 0 } ]
      }
    ]);

    expect(component.dataSource.data[0].stepStatuses[0].status).toBe('in_progress');
    expect(component.dataSource.data[0].completionPercentage).toBe(0);
  });

  it('should correctly evaluate step accessibility and navigate to accessible step', () => {
    const statuses = [
      { status: 'complete' },
      { status: 'not_started' },
      { status: 'not_started' }
    ];

    expect(component.canAccessStep(statuses[0], 0, statuses)).toBe(true);
    expect(component.canAccessStep(statuses[1], 1, statuses)).toBe(true);
    expect(component.canAccessStep(statuses[2], 2, statuses)).toBe(false);

    const routerSpy = vi.spyOn((component as any).router, 'navigate');
    component.navigateToStep('c1', 1, true);
    expect(routerSpy).toHaveBeenCalledWith(['/courses', 'view', 'c1', 'step', 1]);

    routerSpy.mockClear();
    component.navigateToStep('c1', 2, false);
    expect(routerSpy).not.toHaveBeenCalled();
  });

  it('should sort data by courseTitle, progress, errors, and lastActive', () => {
    component.ngOnInit();
    const mockRow: any = {
      courseTitle: 'Algebra 101',
      completionPercentage: 75,
      totalErrors: 3,
      lastActive: 1700000000000
    };

    expect(component.dataSource.sortingDataAccessor(mockRow, 'courseTitle')).toBe('algebra 101');
    expect(component.dataSource.sortingDataAccessor(mockRow, 'progress')).toBe(75);
    expect(component.dataSource.sortingDataAccessor(mockRow, 'errors')).toBe(3);
    expect(component.dataSource.sortingDataAccessor(mockRow, 'lastActive')).toBe(1700000000000);
  });
});
