import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { StateService } from '../state.service';
import { DialogsAnnouncementComponent } from '../dialogs/dialogs-announcement.component';

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
    private stateService: StateService
  ) { }

  getChallenges(configuration: any = this.stateService.configuration): PlanetChallenge[] {
    return Array.isArray(configuration?.challenges) ? configuration.challenges.map(challenge => this.normalizeChallenge(challenge)) : [];
  }

  getActiveChallenge(referenceDate = new Date(), configuration: any = this.stateService.configuration): PlanetChallenge | undefined {
    return this.getChallenges(configuration).find(challenge => this.isChallengeActive(challenge, referenceDate));
  }

  getActiveChallengeForCourse(courseId: string, referenceDate = new Date(), configuration: any = this.stateService.configuration) {
    return this.getChallenges(configuration)
      .find(challenge => challenge.courseId === courseId && this.isChallengeActive(challenge, referenceDate));
  }

  getChallengeForNotification(notification: any, referenceDate = new Date(), configuration: any = this.stateService.configuration) {
    const challenges = this.getChallenges(configuration);
    const activeChallenges = challenges.filter(challenge => this.isChallengeActive(challenge, referenceDate));
    return challenges.find(challenge => challenge.id === notification?.challengeId) || activeChallenges[0];
  }

  isChallengeActive(challenge: PlanetChallenge, referenceDate = new Date()): boolean {
    if (!challenge?.enabled) {
      return false;
    }
    const startsAt = this.parseDateBoundary(challenge.startsAt, 'start');
    const endsAt = this.parseDateBoundary(challenge.endsAt, 'end');
    return (!startsAt || referenceDate >= startsAt) && (!endsAt || referenceDate <= endsAt);
  }

  createChallengeNotification(userId: string, challenge: PlanetChallenge, time: any) {
    return {
      user: userId,
      message: challenge.notificationMessage || challenge.title,
      type: 'challenges',
      priority: 1,
      status: 'unread',
      time,
      challengeId: challenge.id
    };
  }

  openChallengeDialog(dialog: MatDialog, challenge: PlanetChallenge) {
    return dialog.open(DialogsAnnouncementComponent, {
      width: '50vw',
      maxHeight: '100vh',
      data: challenge
    });
  }

  normalizeChallenge(challenge: Partial<PlanetChallenge>): PlanetChallenge {
    return {
      id: challenge?.id || `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: challenge?.title || '',
      enabled: challenge?.enabled !== false,
      courseId: challenge?.courseId || '',
      surveyExamId: challenge?.surveyExamId || '',
      startsAt: challenge?.startsAt || '',
      endsAt: challenge?.endsAt || '',
      bannerImageUrl: challenge?.bannerImageUrl || DEFAULT_BANNER,
      notificationMessage: challenge?.notificationMessage || '',
      successMessage: challenge?.successMessage || '¡Felicidades reto completado!',
      goal: Number(challenge?.goal ?? 500),
      joinCourseReward: Number(challenge?.joinCourseReward ?? 0),
      voicePostReward: Number(challenge?.voicePostReward ?? 2),
      surveyCompletionReward: Number(challenge?.surveyCompletionReward ?? 1),
      maxDailyPosts: Number(challenge?.maxDailyPosts ?? 5)
    };
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
