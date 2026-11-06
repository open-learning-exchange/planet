import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { findDocuments } from '@shared/database/mango-queries';
import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';
import { UserService } from '@shared/auth/user.service';

import { ChallengesAnnouncementDialogComponent } from './challenges-announcement-dialog.component';

const DEFAULT_BANNER = 'assets/challenge/dec challenge.jpeg';

export type ChallengeTaskType = 'course_join' | 'course_complete' | 'survey_complete' | 'voice_post';

export const CHALLENGE_TASK_TYPES: ChallengeTaskType[] = [ 'course_join', 'course_complete', 'survey_complete', 'voice_post' ];
export const REPEATABLE_TASK_TYPES: ChallengeTaskType[] = [ 'voice_post' ];
export const COMPLETE_TASK_ID = 'complete';

export interface ChallengeTask {
  id: string;
  type: ChallengeTaskType;
  targetId?: string;
  courseId?: string;
  reward: number;
  countBy?: 'each' | 'day';
  maxCount?: number;
  requiredCount?: number;
}

export interface PlanetChallenge {
  _id: string;
  _rev?: string;
  type?: 'challenge';
  title: string;
  enabled: boolean;
  startsAt?: string;
  endsAt?: string;
  bannerImageUrl?: string;
  notificationMessage?: string;
  successMessage?: string;
  goal: number;
  tasks: ChallengeTask[];
}

@Injectable({
  providedIn: 'root'
})
export class ChallengesService {

  private announced = new Set<string>();

  constructor(
    private couchService: CouchService,
    private dialogGuard: DialogGuardService,
    private userService: UserService
  ) { }

  getChallenges(): Observable<PlanetChallenge[]> {
    // Not findAll: it turns errors into an empty list
    return this.couchService.post('challenges/_find', findDocuments({ type: 'challenge' })).pipe(
      map(({ docs }) => docs.map(challenge => this.normalizeChallenge(challenge))),
      catchError(error => error.status === 404 ? of([]) : throwError(error))
    );
  }

  getActiveChallenges(referenceDate = new Date()): Observable<PlanetChallenge[]> {
    return this.getChallenges().pipe(
      // An announcement that can't load just doesn't show; getChallenges() keeps the error for editors
      catchError(() => of([])),
      map(challenges => challenges.filter(challenge => this.isChallengeActive(challenge, referenceDate)))
    );
  }

  getActiveChallenge(referenceDate = new Date()): Observable<PlanetChallenge | undefined> {
    return this.getActiveChallenges(referenceDate).pipe(map(challenges => challenges[0]));
  }

  getActiveChallengeForCourse(courseId: string, referenceDate = new Date()): Observable<PlanetChallenge | undefined> {
    return this.getActiveChallenges(referenceDate).pipe(map(challenges => challenges.find(challenge =>
      !!courseId && challenge.tasks.some(task => task.targetId === courseId || task.courseId === courseId)
    )));
  }

  getChallengeForNotification(notification: any, referenceDate = new Date()): Observable<PlanetChallenge | undefined> {
    return this.getActiveChallenges(referenceDate).pipe(map(challenges => notification?.challengeId ?
      challenges.find(challenge => challenge._id === notification.challengeId) :
      challenges[0]
    ));
  }

  isChallengeActive(challenge: PlanetChallenge, referenceDate = new Date()): boolean {
    if (!challenge?.enabled || !challenge._id || challenge._id.includes(':') || !challenge.tasks?.length ||
      !this.hasValidDateBoundaries(challenge)) {
      return false;
    }
    const { start, end } = this.challengeWindow(challenge);
    return (!start || referenceDate >= start) && (!end || referenceDate <= end);
  }

  challengeWindow(challenge: PlanetChallenge): { start?: Date, end?: Date } {
    return { start: this.parseDateBoundary(challenge.startsAt, 'start'), end: this.parseDateBoundary(challenge.endsAt, 'end') };
  }

  createChallengeNotification(userId: string, challenge: PlanetChallenge, time: any) {
    return {
      _id: `challenge:${challenge._id}:${userId}`,
      user: userId,
      message: challenge.notificationMessage || challenge.title || $localize`Challenge update`,
      type: 'challenges',
      priority: 1,
      status: 'unread',
      time,
      challengeId: challenge._id
    };
  }

  openChallengeDialog(dialog: MatDialog, challenge: PlanetChallenge) {
    return dialog.open(ChallengesAnnouncementDialogComponent, {
      width: '50vw',
      maxHeight: '100vh',
      data: challenge
    });
  }

  openChallengeDialogOnce(dialog: MatDialog, challenge$: Observable<PlanetChallenge | undefined>) {
    // Pages call this on load, where covering the page would flash the overlay on every visit
    return this.dialogGuard.open('challenge-announcement', () => challenge$.pipe(
      filter(challenge => !!challenge),
      map(challenge => this.openChallengeDialog(dialog, challenge))
    ), { cover: false });
  }

  // Keyed by user: learners share devices without reloading
  announceOnce(dialog: MatDialog, challenge$: Observable<PlanetChallenge | undefined>) {
    const key = (challenge: PlanetChallenge) => `${this.userService.get()?.name}:${challenge._id}`;
    return this.openChallengeDialogOnce(dialog, challenge$.pipe(
      filter(challenge => !!challenge && !this.announced.has(key(challenge))),
      map(challenge => {
        this.announced.add(key(challenge));
        return challenge;
      })
    ));
  }

  normalizeChallenge(challenge: Partial<PlanetChallenge>): PlanetChallenge {
    return {
      ...challenge,
      _id: challenge?._id || '',
      title: challenge?.title || '',
      enabled: challenge?.enabled !== false,
      startsAt: challenge?.startsAt || '',
      endsAt: challenge?.endsAt || '',
      bannerImageUrl: challenge?.bannerImageUrl || DEFAULT_BANNER,
      notificationMessage: challenge?.notificationMessage || '',
      successMessage: challenge?.successMessage || $localize`Congratulations, challenge complete!`,
      goal: this.getNumber(challenge?.goal, 500),
      tasks: (Array.isArray(challenge?.tasks) ? challenge.tasks : [])
        .filter((task, index, tasks) => this.isUsableTask(task) && tasks.findIndex(other => other?.id === task.id) === index)
        .map(task => this.normalizeTask(task))
    };
  }

  private isUsableTask(task: Partial<ChallengeTask>) {
    return typeof task?.id === 'string' && task.id !== '' && !task.id.includes(':') && task.id !== COMPLETE_TASK_ID &&
      CHALLENGE_TASK_TYPES.includes(task.type) && (task.type === 'voice_post' || !!task.targetId);
  }

  private normalizeTask(task: Partial<ChallengeTask>): ChallengeTask {
    const limit = (value: any) => value === undefined || value === null || value === '' ? undefined : Math.floor(this.getNumber(value, 0));
    const repeatable = REPEATABLE_TASK_TYPES.includes(task.type);
    return {
      ...task,
      id: task.id,
      type: task.type,
      reward: this.getNumber(task.reward, 0),
      countBy: task.countBy === 'day' ? 'day' : 'each',
      maxCount: limit(task.maxCount),
      requiredCount: repeatable ? limit(task.requiredCount) : undefined
    };
  }

  private hasValidDateBoundaries(challenge: PlanetChallenge) {
    return [ challenge.startsAt, challenge.endsAt ].every(value => !value || !Number.isNaN(new Date(value).getTime()));
  }

  private getNumber(value: any, fallback: number) {
    const numberValue = value === undefined || value === null || value === '' ? NaN : Number(value);
    return Number.isFinite(numberValue) ? Math.max(0, numberValue) : fallback;
  }

  parseDateBoundary(value: string | undefined, boundary: 'start' | 'end') {
    if (!value) {
      return undefined;
    }
    const [ , year, month, day ] = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
    const date = year ? new Date(Number(year), Number(month) - 1, Number(day)) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    if (value.length <= 10) {
      if (boundary === 'start') {
        date.setHours(0, 0, 0, 0);
      } else {
        date.setHours(23, 59, 59, 999);
      }
    }
    return date;
  }
}
