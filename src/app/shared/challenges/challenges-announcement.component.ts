import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { NgClass } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatAnchor } from '@angular/material/button';

import { PlanetMessageService } from '@shared/ui/planet-message.service';

import { CoursesService } from '../../courses/courses.service';
import { ChallengesProgressService, UserProgress } from './challenges-progress.service';
import { ChallengeTask, ChallengesService, PlanetChallenge, REPEATABLE_TASK_TYPES } from './challenges.service';

@Component({
  selector: 'planet-challenges-announcement',
  templateUrl: './challenges-announcement.component.html',
  styleUrls: ['./challenges-announcement.component.scss'],
  imports: [NgClass, MatProgressSpinner, MatIcon, MatAnchor]
})
export class ChallengesAnnouncementComponent implements OnInit {

  @Input({ required: true }) challenge: PlanetChallenge;
  @Input() progress: UserProgress | undefined;
  @Input() groupEarned = 0;
  @Input() preview = false;
  @Output() leave = new EventEmitter<void>();
  isJoining = false;

  constructor(
    private router: Router,
    private coursesService: CoursesService,
    private planetMessageService: PlanetMessageService,
    private challengesService: ChallengesService,
    private challengesProgressService: ChallengesProgressService
  ) {}

  ngOnInit() {
    this.coursesService.requestCourses();
  }

  coverImageUrl(): string {
    return this.challengesService.coverImageUrl(this.challenge);
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
        this.leave.emit();
      },
      error: () => this.planetMessageService.showAlert($localize`There was a problem joining the course.`)
    });
  }

  openCourse(task: ChallengeTask) {
    this.router.navigate([ `/courses/view/${task.targetId}` ]);
    this.leave.emit();
  }

  openPage(path: string) {
    this.router.navigate([ path ]);
    this.leave.emit();
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
    this.leave.emit();
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
    this.leave.emit();
  }
}
