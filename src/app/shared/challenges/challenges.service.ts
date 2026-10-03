import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { StateService } from '../state.service';
import { CouchService } from '../database/couchdb.service';
import { ChallengesAnnouncementDialogComponent } from './challenges-announcement-dialog.component';
import { planetAndParentId } from '../utils';

const DEFAULT_BANNER = 'assets/challenge/dec challenge.jpeg';

export interface PlanetChallenge {
  id: string;
  title: string;
  enabled: boolean;
  courseId: string;
  surveyExamId: string;
  startsAt?: string;
  endsAt?: string;
  bannerImageUrl?: string;
  notificationMessage?: string;
  successMessage?: string;
  goal?: number;
  joinCourseReward?: number;
  voicePostReward?: number;
  surveyCompletionReward?: number;
  maxDailyPosts?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChallengesService {

  constructor(
    private stateService: StateService,
    private couchService: CouchService
  ) { }

  getChallenges(): Observable<PlanetChallenge[]> {
    return this.couchService.get(`teams/${planetAndParentId(this.stateService.configuration)}`).pipe(
      map(servicesDoc => this.servicesDocChallenges(servicesDoc)),
      catchError(() => of([]))
    );
  }

  activeChallengeIn(servicesDoc: any, referenceDate = new Date()): PlanetChallenge | undefined {
    return this.servicesDocChallenges(servicesDoc).find(challenge => this.isChallengeActive(challenge, referenceDate));
  }

  private servicesDocChallenges(servicesDoc: any): PlanetChallenge[] {
    return (Array.isArray(servicesDoc?.challenges) ? servicesDoc.challenges : []).map(challenge => this.normalizeChallenge(challenge));
  }

  getActiveChallenge(referenceDate = new Date()): Observable<PlanetChallenge | undefined> {
    return this.getActiveChallenges(referenceDate).pipe(map(challenges => challenges[0]));
  }

  getActiveChallengeForCourse(courseId: string, referenceDate = new Date()): Observable<PlanetChallenge | undefined> {
    return this.getActiveChallenges(referenceDate).pipe(map(challenges => challenges.find(challenge => challenge.courseId === courseId)));
  }

  getChallengeForNotification(notification: any, referenceDate = new Date()): Observable<PlanetChallenge | undefined> {
    return this.getActiveChallenges(referenceDate).pipe(map(challenges => notification?.challengeId ?
      challenges.find(challenge => challenge.id === notification.challengeId) :
      challenges[0]
    ));
  }

  private getActiveChallenges(referenceDate: Date) {
    return this.getChallenges().pipe(map(challenges => challenges.filter(challenge => this.isChallengeActive(challenge, referenceDate))));
  }

  isChallengeActive(challenge: PlanetChallenge, referenceDate = new Date()): boolean {
    if (!challenge?.enabled || !this.hasRequiredChallengeFields(challenge) || !this.hasValidDateBoundaries(challenge)) {
      return false;
    }
    const startsAt = this.parseDateBoundary(challenge.startsAt, 'start');
    const endsAt = this.parseDateBoundary(challenge.endsAt, 'end');
    return (!startsAt || referenceDate >= startsAt) && (!endsAt || referenceDate <= endsAt);
  }

  createChallengeNotification(userId: string, challenge: PlanetChallenge, time: any) {
    return {
      user: userId,
      message: challenge.notificationMessage || challenge.title || $localize`Challenge update`,
      type: 'challenges',
      priority: 1,
      status: 'unread',
      time,
      challengeId: challenge.id
    };
  }

  openChallengeDialog(dialog: MatDialog, challenge: PlanetChallenge) {
    return dialog.open(ChallengesAnnouncementDialogComponent, {
      width: '50vw',
      maxHeight: '100vh',
      data: challenge
    });
  }

  normalizeChallenge(challenge: Partial<PlanetChallenge>): PlanetChallenge {
    return {
      id: this.getChallengeId(challenge),
      title: challenge?.title || '',
      enabled: challenge?.enabled !== false,
      courseId: challenge?.courseId || '',
      surveyExamId: challenge?.surveyExamId || '',
      startsAt: challenge?.startsAt || '',
      endsAt: challenge?.endsAt || '',
      bannerImageUrl: challenge?.bannerImageUrl || DEFAULT_BANNER,
      notificationMessage: challenge?.notificationMessage || '',
      successMessage: challenge?.successMessage || '¡Felicidades reto completado!',
      goal: this.getNumber(challenge?.goal, 500, 0),
      joinCourseReward: this.getNumber(challenge?.joinCourseReward, 0, 0),
      voicePostReward: this.getNumber(challenge?.voicePostReward, 2, 0),
      surveyCompletionReward: this.getNumber(challenge?.surveyCompletionReward, 1, 0),
      maxDailyPosts: this.getInteger(challenge?.maxDailyPosts, 5, 0)
    };
  }

  private hasRequiredChallengeFields(challenge: PlanetChallenge) {
    return Boolean(challenge.courseId && challenge.surveyExamId);
  }

  private hasValidDateBoundaries(challenge: PlanetChallenge) {
    return [ challenge.startsAt, challenge.endsAt ].every(value => !value || !Number.isNaN(new Date(value).getTime()));
  }

  private getChallengeId(challenge: Partial<PlanetChallenge>) {
    if (challenge?.id) {
      return challenge.id;
    }
    const stableKey = [
      challenge?.courseId,
      challenge?.surveyExamId,
      challenge?.startsAt,
      challenge?.endsAt,
      challenge?.title
    ].filter(Boolean).join('-');
    return stableKey ? `challenge-${stableKey}` : 'challenge';
  }

  private getNumber(value: any, fallback: number, min?: number) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return fallback;
    }
    return min === undefined ? numberValue : Math.max(min, numberValue);
  }

  private getInteger(value: any, fallback: number, min?: number) {
    return Math.floor(this.getNumber(value, fallback, min));
  }

  private parseDateBoundary(value: string | undefined, boundary: 'start' | 'end') {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
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
