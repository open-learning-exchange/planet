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
import { ChallengeTask, ChallengesService, PlanetChallenge, REPEATABLE_TASK_TYPES } from './challenges.service';

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

  isRepeatable(task: ChallengeTask) {
    return REPEATABLE_TASK_TYPES.includes(task.type);
  }

  rewardLabel(task: ChallengeTask): string {
    if (this.isRepeatable(task) && (task.countBy === 'day' || task.type === 'login')) {
      return $localize`$${task.reward}:reward: per day`;
    }
    switch (task.type) {
      case 'voice_post': return $localize`$${task.reward}:reward: per voice`;
      case 'voice_reply': return $localize`$${task.reward}:reward: per reply`;
      case 'resource_open': return $localize`$${task.reward}:reward: per resource`;
      case 'rating': return $localize`$${task.reward}:reward: per rating`;
      case 'course_step': return $localize`$${task.reward}:reward: per step`;
      default: return `$${task.reward}`;
    }
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

  openPage(path: string) {
    this.router.navigate([ path ]);
    this.dialogRef.close();
  }

  openTestStep(task: ChallengeTask) {
    const { courseId, stepNum } = this.taskStep(task);
    this.openPage(`/courses/view/${courseId}/step/${stepNum}`);
  }

  doSurvey(task: ChallengeTask) {
    const step = this.taskStep(task);
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

  taskStep(task: ChallengeTask): { courseId: string, stepNum: number } | undefined {
    const isTaskStep = (step: any) => step[task.type === 'exam_pass' ? 'exam' : 'survey']?._id === task.targetId;
    const hasTaskStep = (candidate: any) =>
      candidate && (!task.courseId || candidate._id === task.courseId) && candidate.steps?.some(isTaskStep);
    const { course: openCourse, local } = this.coursesService;
    const course = local.courses.find(hasTaskStep) ?? (hasTaskStep(openCourse) ? openCourse : undefined);
    return course && { courseId: course._id, stepNum: course.steps.findIndex(isTaskStep) + 1 };
  }

  shareVoice() {
    this.router.navigate([ '/' ]);
    this.dialogRef.close();
  }
}
