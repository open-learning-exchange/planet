import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../../shared/user.service';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';

export interface LearnerCourseRow {
  courseId: string;
  courseTitle: string;
  passedStepsCount: number;
  totalSteps: number;
  completionPercentage: number;
  totalErrors: number;
  pendingGradingCount: number;
  lastActive: number | null;
  stepStatuses: Array<{
    stepIndex: number;
    stepTitle: string;
    status: string;
    errors: number;
    hasExam: boolean;
    hasSurvey: boolean;
    feedbackList: Array<{ questionText?: string; comment: string; date?: string }>;
  }>;
}

@Component({
  templateUrl: 'courses-progress-learner.component.html',
  styleUrls: ['courses-progress.scss'],
  imports: [
    DatePipe,
    MatToolbarModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatExpansionModule,
    PlanetLoadingSpinnerComponent
  ]
})
export class CoursesProgressLearnerComponent implements OnInit, OnDestroy {
  user = this.userService.get();
  headingStart = ((this.user.firstName || '') + ' ' + (this.user.lastName || '')).trim() || this.user.name;
  courses: any[] = [];
  submissions: any[] = [];
  onDestroy$ = new Subject<void>();
  isLoading = true;

  totalCourses = 0;
  avgCompletionPercentage = 0;
  pendingGradingCount = 0;
  totalStepsCompleted = 0;
  totalErrorsCount = 0;

  dataSource = new MatTableDataSource<LearnerCourseRow>([]);
  displayedColumns: string[] = ['courseTitle', 'progress', 'stepStatuses', 'errors', 'lastActive', 'actions'];
  expandedCourseId: string | null = null;

  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.dataSource.sortingDataAccessor = (item: LearnerCourseRow, property: string) => {
      switch (property) {
        case 'courseTitle':
          return item.courseTitle ? item.courseTitle.toLowerCase() : '';
        case 'progress':
          return item.completionPercentage || 0;
        case 'errors':
          return item.totalErrors || 0;
        case 'lastActive':
          return item.lastActive ? new Date(item.lastActive).getTime() : 0;
        default:
          return (item as any)[property];
      }
    };
    this.coursesService.progressLearnerListener$().pipe(takeUntil(this.onDestroy$)).subscribe((courses: any[]) => {
      if (courses !== undefined) {
        this.courses = courses;
        this.processLearnerProgress();
      }
    });

    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((submissions: any[]) => {
      this.submissions = submissions || [];
      this.processLearnerProgress();
      this.isLoading = false;
    });

    this.refreshData();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  refreshData() {
    this.isLoading = true;
    this.submissionsService.updateSubmissions({ query: { 'selector': { 'user.name': this.user.name } } });
    this.coursesService.requestCourses();
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  navigateBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  navigateToCourse(courseId: string) {
    if (courseId) {
      this.router.navigate([ '/courses', 'view', courseId ]);
    }
  }

  navigateToStep(courseId: string, stepNum: number, canAccess: boolean) {
    if (canAccess && courseId && stepNum) {
      this.router.navigate([ '/courses', 'view', courseId, 'step', stepNum ]);
    }
  }

  canAccessStep(step: any, stepIndex: number, stepStatuses: any[]): boolean {
    if (stepIndex === 0) {
      return true;
    }
    if (step.status !== 'not_started') {
      return true;
    }
    const prevStep = stepStatuses[stepIndex - 1];
    return prevStep && prevStep.status !== 'not_started';
  }

  toggleExpandCourse(courseId: string) {
    this.expandedCourseId = this.expandedCourseId === courseId ? null : courseId;
  }

  formatStatusLabel(status: string): string {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'requires grading':
        return 'Requires Grading';
      case 'failed':
        return 'Failed';
      default:
        return status ? status.replace(/_/g, ' ') : '';
    }
  }

  answerErrorCount(answer: any): number | '' {
    return answer?.grade === undefined ? '' : answer?.mistakes || (1 - answer?.grade);
  }

  totalSubmissionAnswers(submission: any) {
    return {
      number: submission.answers?.reduce((total: number, answer: any) => {
        const err = this.answerErrorCount(answer);
        return total + (typeof err === 'number' ? err : 0);
      }, 0) || 0
    };
  }

  isSubmissionPassed(sub: any): boolean {
    if (!sub || sub.status !== 'complete') {
      return false;
    }
    const allAnswersPassed = sub.answers?.every((a: any) => a.grade === 1 || a.grade === undefined);
    return sub.passed !== false && allAnswersPassed;
  }

  private userProgress(courseItem: any) {
    return courseItem.progress?.find((p: any) => p.user === this.user.name || p.user === this.user._id);
  }

  processLearnerProgress() {
    if (!this.courses || !this.courses.length) {
      this.dataSource.data = [];
      this.totalCourses = 0;
      this.avgCompletionPercentage = 0;
      this.pendingGradingCount = 0;
      this.totalErrorsCount = 0;
      return;
    }

    let totalPctSum = 0;
    let totalPending = 0;
    let totalErrors = 0;
    let totalPassedSteps = 0;

    const courseRows: LearnerCourseRow[] = this.courses.map((courseItem: any) => {
      const courseDoc = courseItem.doc || courseItem;
      const courseId = courseDoc._id;
      const steps = courseDoc.steps || [];
      const userProgressDoc = this.userProgress(courseItem);

      const courseSubs = this.submissions.filter((sub: any) => {
        return sub.parentId && sub.parentId.includes(courseId);
      });

      let courseErrorCount = 0;
      let coursePendingCount = 0;
      let lastActiveTimestamp = 0;

      const stepStatuses = steps.map((step: any, index: number) => {
        let stepStatus = 'not_started';
        let stepErrCount = 0;
        const hasExam = !!step.exam;
        const hasSurvey = !!step.survey;
        const feedbackList: Array<{ questionText?: string; comment: string; date?: string }> = [];

        const sanitizedTitle = step.stepTitle && !step.stepTitle.startsWith(`Step ${index + 1}`)
          ? `Step ${index + 1}: ${step.stepTitle}`
          : (step.stepTitle || `Step ${index + 1}`);

        if (hasExam || hasSurvey) {
          const examSubs = hasExam ? courseSubs.filter((s: any) => s.parentId === (step.exam._id + '@' + courseId)) : [];
          const surveySubs = hasSurvey ? courseSubs.filter((s: any) => s.parentId === (step.survey._id + '@' + courseId)) : [];

          examSubs.forEach((sub: any) => {
            stepErrCount += this.totalSubmissionAnswers(sub).number || 0;
            if (sub.lastUpdateTime && sub.lastUpdateTime > lastActiveTimestamp) {
              lastActiveTimestamp = sub.lastUpdateTime;
            }
            if (sub.comment) {
              feedbackList.push({ comment: sub.comment, date: sub.gradeTime || sub.lastUpdateTime });
            }
            sub.answers?.forEach((ans: any, qIdx: number) => {
              if (ans.comment) {
                feedbackList.push({
                  questionText: `Q${qIdx + 1}`,
                  comment: ans.comment,
                  date: sub.gradeTime || sub.lastUpdateTime
                });
              }
            });
          });

          surveySubs.forEach((sub: any) => {
            stepErrCount += this.totalSubmissionAnswers(sub).number || 0;
            if (sub.lastUpdateTime && sub.lastUpdateTime > lastActiveTimestamp) {
              lastActiveTimestamp = sub.lastUpdateTime;
            }
          });

          courseErrorCount += stepErrCount;

          const isExamGradingPending = hasExam && examSubs.some((s: any) => s.status === 'requires grading');
          const isSurveyGradingPending = hasSurvey && surveySubs.some((s: any) => s.status === 'requires grading');

          const isExamComplete = !hasExam || examSubs.some((s: any) => this.isSubmissionPassed(s));
          const isSurveyComplete = !hasSurvey || surveySubs.some((s: any) => s.status === 'complete');

          const isExamFailed = hasExam && !isExamComplete &&
            examSubs.some((s: any) => s.status === 'complete' && !this.isSubmissionPassed(s));

          if (isExamGradingPending || isSurveyGradingPending) {
            stepStatus = 'requires grading';
            coursePendingCount += (isExamGradingPending ? 1 : 0) + (isSurveyGradingPending ? 1 : 0);
          } else if (isExamFailed) {
            stepStatus = 'failed';
          } else if (isExamComplete && isSurveyComplete) {
            stepStatus = 'complete';
          } else if (examSubs.length > 0 || surveySubs.length > 0) {
            stepStatus = 'in_progress';
          } else {
            stepStatus = 'not_started';
          }
        } else {
          if (userProgressDoc?.stepNum > index) {
            stepStatus = 'complete';
          } else if (userProgressDoc?.stepNum === index) {
            stepStatus = 'in_progress';
          }
        }

        return {
          stepIndex: index + 1,
          stepTitle: sanitizedTitle,
          status: stepStatus,
          errors: stepErrCount,
          hasExam,
          hasSurvey,
          feedbackList
        };
      });

      const passedStepsCount = stepStatuses.filter((s) => s.status === 'complete').length;
      const totalSteps = Math.max(steps.length, 1);
      const completionPercentage = Math.min(100, Math.round((passedStepsCount / totalSteps) * 100));

      totalPctSum += completionPercentage;
      totalPending += coursePendingCount;
      totalErrors += courseErrorCount;
      totalPassedSteps += passedStepsCount;

      return {
        courseId,
        courseTitle: courseDoc.courseTitle || 'Untitled Course',
        passedStepsCount,
        totalSteps: steps.length,
        completionPercentage,
        totalErrors: courseErrorCount,
        pendingGradingCount: coursePendingCount,
        lastActive: lastActiveTimestamp || null,
        stepStatuses
      };
    });

    this.totalCourses = courseRows.length;
    this.avgCompletionPercentage = this.totalCourses ? Math.round(totalPctSum / this.totalCourses) : 0;
    this.pendingGradingCount = totalPending;
    this.totalStepsCompleted = totalPassedSteps;
    this.totalErrorsCount = totalErrors;

    this.dataSource.data = courseRows;
  }
}

