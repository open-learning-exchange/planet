import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { NgClass } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatAnchor } from '@angular/material/button';

import { PlanetMessageService } from '@shared/ui/planet-message.service';

import { CoursesService } from '../../courses/courses.service';
import { ChallengesProgressService, UserProgress } from './challenges-progress.service';
import { ChallengeTask, ChallengesService, PlanetChallenge } from './challenges.service';

@Component({
  template: `
    <div class="announcement-container">
      <img
        [src]="challenge.bannerImageUrl"
        [alt]="challenge.title || 'Challenge banner'"
        class="announcement-banner"
      />
      <p class="success-msg">{{ challenge.successMessage }}</p>
    </div>
  `,
  styleUrls: ['./challenges-announcement-dialog.component.scss']
})
export class ChallengesAnnouncementSuccessDialogComponent {
  challenge: PlanetChallenge;

  constructor(
    private challengesService: ChallengesService,
    @Inject(MAT_DIALOG_DATA) public data: PlanetChallenge | null,
  ) {
    this.challenge = this.challengesService.normalizeChallenge(data || {});
  }
}

@Component({
  templateUrl: './challenges-announcement-dialog.component.html',
  styleUrls: ['./challenges-announcement-dialog.component.scss'],
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, NgClass, MatProgressSpinner, MatIcon, MatAnchor]
})
export class ChallengesAnnouncementDialogComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  challenge: PlanetChallenge;
  progress: UserProgress | undefined;
  progressLoaded = false;
  groupEarned = 0;
  isLoading = true;
  isJoining = false;
  isPreview = !this.challengesProgressService.canTakePart();

  constructor(
    public dialogRef: MatDialogRef<ChallengesAnnouncementDialogComponent>,
    private router: Router,
    private coursesService: CoursesService,
    private planetMessageService: PlanetMessageService,
    private challengesService: ChallengesService,
    private challengesProgressService: ChallengesProgressService,
    @Inject(MAT_DIALOG_DATA) public data: PlanetChallenge | null
  ) {}

  ngOnInit() {
    this.challenge = this.challengesService.normalizeChallenge(this.data || {});
    this.coursesService.requestCourses();
    this.challengesProgressService.refresh(this.challenge).pipe(
      map(({ progress }) => ({ progress, progressLoaded: true })),
      catchError(() => of({ progress: this.challengesProgressService.userProgress(this.challenge, []), progressLoaded: false })),
      switchMap(loaded => this.challengesProgressService.groupEarned(this.challenge).pipe(
        catchError(() => of(0)),
        map(groupEarned => ({ ...loaded, groupEarned }))
      )),
      takeUntil(this.onDestroy$)
    ).subscribe(({ progress, progressLoaded, groupEarned }) => {
      Object.assign(this, { progress, progressLoaded, groupEarned, isLoading: false });
    });
  }

  needsReminder() {
    return this.progressLoaded && !this.isPreview && !this.progress.complete;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  goalPercentage(): number {
    return this.challenge.goal > 0 ? (this.groupEarned / this.challenge.goal) * 100 : 0;
  }

  maxEarnable(): number {
    return this.challenge.tasks.reduce((total, task) => total + this.challengesProgressService.maxEarnable(task), 0);
  }

  countDots(task: ChallengeTask) {
    return Array.from({ length: task.maxCount ?? 0 }, (_, index) => index);
  }

  courseTitle(courseId: string) {
    return this.coursesService.getCourseNameFromId(courseId) || '';
  }

  joinCourse(task: ChallengeTask) {
    this.isJoining = true;
    this.coursesService.courseResignAdmission(task.targetId, 'admission', this.courseTitle(task.targetId)).pipe(
      finalize(() => this.isJoining = false)
    ).subscribe({
      next: () => {
        this.challengesProgressService.record('course_join').subscribe();
        this.router.navigate([ `/courses/view/${task.targetId}/step/1` ]);
        this.dialogRef.close();
      },
      error: () => this.planetMessageService.showAlert($localize`There was a problem joining the course.`)
    });
  }

  openCourse(task: ChallengeTask) {
    this.router.navigate([ `/courses/view/${task.targetId}` ]);
    this.dialogRef.close();
  }

  doSurvey(task: ChallengeTask) {
    const step = this.surveyStep(task);
    if (!step) {
      return;
    }
    const { courseId, stepNum } = step;
    this.router.navigate([ `/courses/view/${courseId}/step/${stepNum}/exam`, {
      id: courseId,
      stepNum,
      questionNum: 1,
      type: 'survey',
      preview: 'false',
      examId: task.targetId
    } ]);
    this.dialogRef.close();
  }

  surveyStep(task: ChallengeTask): { courseId: string, stepNum: number } | undefined {
    const isSurveyStep = (step: any) => step.survey?._id === task.targetId;
    const hasSurvey = (candidate: any) =>
      candidate && (!task.courseId || candidate._id === task.courseId) && candidate.steps?.some(isSurveyStep);
    const { course: openCourse, local } = this.coursesService;
    const course = local.courses.find(hasSurvey) ?? (hasSurvey(openCourse) ? openCourse : undefined);
    return course && { courseId: course._id, stepNum: course.steps.findIndex(isSurveyStep) + 1 };
  }

  shareVoice() {
    this.router.navigate([ '/' ]);
    this.dialogRef.close();
  }
}
