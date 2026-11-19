import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { findDocuments } from '@shared/database/mango-queries';
import { StateService } from '@shared/state.service';
import { UserService } from '@shared/auth/user.service';
import { formatDate, planetAndParentId } from '@shared/utils';

import { attemptPasses } from '../../courses/courses.utils';

import { ChallengesAnnouncementSuccessDialogComponent } from './challenges-announcement-dialog.component';
import {
  COMPLETE_TASK_ID, ChallengeTask, ChallengeTaskType, ChallengesService, PlanetChallenge, REPEATABLE_TASK_TYPES
} from './challenges.service';

const DB = 'challenge_progress';

interface Evidence {
  id: string;
  time: number;
  // The thing done, so repeating the action doesn't count again
  unit?: string;
}

export interface TaskProgress {
  task: ChallengeTask;
  count: number;
  rewarded: number;
  earned: number;
  done: boolean;
  settled: boolean;
}

export interface UserProgress {
  tasks: TaskProgress[];
  earned: number;
  complete: boolean;
  succeeded: boolean;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable({
  providedIn: 'root'
})
export class ChallengesProgressService {

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private challengesService: ChallengesService,
    private dialog: MatDialog
  ) {}

  record(...types: ChallengeTaskType[]): Observable<boolean> {
    if (!this.canTakePart()) {
      return of(false);
    }
    return this.challengesService.getActiveChallenges().pipe(
      map(challenges => challenges.filter(challenge => challenge.tasks.some(task => types.includes(task.type)))),
      switchMap(challenges => challenges.length ?
        forkJoin(challenges.map(challenge => this.refresh(challenge).pipe(
          map(({ completedNow }) => completedNow),
          catchError(() => of(false))
        ))) :
        of([])
      ),
      map(completed => completed.some(Boolean))
    );
  }

  recordThenAnnounce(courseId: string, ...types: ChallengeTaskType[]) {
    return this.record(...types).pipe(
      switchMap(completed => completed ? EMPTY : this.challengesService.openChallengeDialogOnce(
        this.dialog, this.challengesService.getActiveChallengeForCourse(courseId)
      ))
    );
  }

  refresh(challenge: PlanetChallenge): Observable<{ progress: UserProgress, completedNow: boolean }> {
    if (!this.canTakePart()) {
      return of({ progress: this.userProgress(challenge, []), completedNow: false });
    }
    const user = this.userService.get();
    return this.userDocs(challenge, user.name).pipe(
      switchMap(existing => {
        const tasks = this.userProgress(challenge, existing).tasks
          .filter(({ settled }) => !settled)
          .map(({ task }) => task);
        const evidenceByTask$ = tasks.length ?
          forkJoin(tasks.map(task => this.evidence(challenge, task, user).pipe(catchError(() => of([]))))) :
          of([]);
        return evidenceByTask$.pipe(
          map(evidenceByTask => tasks.flatMap((task, index) => this.progressDocs(challenge, task, user.name, evidenceByTask[index]))),
          map(docs => docs.filter(doc => !existing.some(existingDoc => existingDoc._id === doc._id))),
          switchMap(docs => docs.length ?
            this.couchService.post(`${DB}/_bulk_docs`, { docs }).pipe(switchMap(() => this.userDocs(challenge, user.name))) :
            of(existing))
        );
      }),
      switchMap(docs => {
        const progress = this.userProgress(challenge, docs);
        if (!progress.complete || progress.succeeded) {
          return of({ progress, completedNow: false });
        }
        return this.couchService.post(`${DB}/_bulk_docs`, { docs: [ this.completeDoc(challenge, user.name) ] }).pipe(
          // 409: another tab got there first and shows the dialog
          map(([ result ]: any[]) => ({ progress: { ...progress, succeeded: true }, completedNow: !!result?.ok })),
          map(result => {
            if (result.completedNow) {
              this.openSuccessDialog(challenge);
            }
            return result;
          })
        );
      })
    );
  }

  canTakePart() {
    const user = this.userService.get();
    return !!user?.name && !user.isUserAdmin && !this.userService.doesUserHaveRole([ '_admin', 'manager' ]);
  }

  userProgress(challenge: PlanetChallenge, docs: any[]): UserProgress {
    const tasks = challenge.tasks.map(task => {
      const count = this.units(task, this.dayCounts(docs.filter(doc => doc.taskId === task.id)));
      const rewarded = Math.min(count, task.maxCount ?? Infinity);
      const done = count >= (task.requiredCount || 1);
      return { task, count, rewarded, earned: rewarded * task.reward, done, settled: done && rewarded >= (task.maxCount ?? 1) };
    });
    const required = tasks.filter(({ task }) => !task.optional);
    return {
      tasks,
      earned: tasks.reduce((total, task) => total + task.earned, 0),
      complete: required.length > 0 && required.every(task => task.done),
      succeeded: docs.some(doc => doc.taskId === COMPLETE_TASK_ID)
    };
  }

  groupEarned(challenge: PlanetChallenge): Observable<number> {
    // Only this planet's learners: planetCode is the writer's word, and each new one would count as another learner
    const planet = [ challenge._id, this.stateService.configuration.code ];
    return this.couchService.get(`${DB}/_design/${DB}/_view/totals`, { params: {
      group_level: '5', startkey: JSON.stringify(planet), endkey: JSON.stringify([ ...planet, {} ])
    } }).pipe(
      map(({ rows }) => {
        const dayCounts: Record<string, { taskId: string, counts: number[] }> = rows.reduce(
          (byLearnerTask, { key: [ , planetCode, user, taskId ], value }) => {
            const learnerTask = JSON.stringify([ planetCode, user, taskId ]);
            byLearnerTask[learnerTask] ??= { taskId, counts: [] };
            byLearnerTask[learnerTask].counts.push(value);
            return byLearnerTask;
          }, {}
        );
        const earned = Object.values(dayCounts).reduce((total, { taskId, counts }) => {
          const task = challenge.tasks.find(({ id }) => id === taskId);
          return total + (task ? Math.min(this.units(task, counts), task.maxCount ?? Infinity) * task.reward : 0);
        }, 0);
        return Math.min(earned, challenge.goal);
      })
    );
  }

  maxEarnable(task: ChallengeTask): number {
    return REPEATABLE_TASK_TYPES.includes(task.type) ? task.maxCount * task.reward : task.reward;
  }

  private units(task: ChallengeTask, dayCounts: number[]) {
    const docs = dayCounts.reduce((sum, count) => sum + count, 0);
    if (!REPEATABLE_TASK_TYPES.includes(task.type)) {
      return Math.min(docs, 1);
    }
    return task.countBy === 'day' ? dayCounts.filter(count => count > 0).length : docs;
  }

  private dayCounts(docs: any[]): number[] {
    const counts = docs.reduce((byDay, doc) => ({ ...byDay, [doc.day]: (byDay[doc.day] || 0) + 1 }), {} as Record<string, number>);
    return Object.values(counts);
  }

  private userDocs(challenge: PlanetChallenge, userName: string): Observable<any[]> {
    const prefix = `${this.idPrefix(challenge, userName)}:`;
    const planetCode = this.stateService.configuration.code;
    return this.couchService.get(`${DB}/_all_docs`, { params: {
      include_docs: 'true', startkey: JSON.stringify(prefix), endkey: JSON.stringify(`${prefix}\ufff0`)
    } }).pipe(map(({ rows }) => rows.map(row => row.doc).filter(doc =>
      doc?.user === userName && doc.challengeId === challenge._id && doc.planetCode === planetCode
    )));
  }

  private idPrefix(challenge: PlanetChallenge, userName: string) {
    return [ challenge._id, this.stateService.configuration.code, userName ].join(':');
  }

  private progressDocs(challenge: PlanetChallenge, task: ChallengeTask, userName: string, evidence: Evidence[]) {
    const repeatable = REPEATABLE_TASK_TYPES.includes(task.type);
    const earliestFirst = [ ...evidence ].sort((a, b) => a.time - b.time);
    const docs = (repeatable ? earliestFirst : earliestFirst.slice(0, 1)).map(({ id, time, unit }) => ({
      _id: [ this.idPrefix(challenge, userName), task.id, ...(repeatable ? [ unit ?? id.slice(id.indexOf('/') + 1) ] : []) ].join(':'),
      challengeId: challenge._id,
      planetCode: this.stateService.configuration.code,
      user: userName,
      taskId: task.id,
      evidence: id,
      day: formatDate(new Date(time)),
      time
    }));
    return docs.filter((doc, index) => docs.findIndex(({ _id }) => _id === doc._id) === index);
  }

  private completeDoc(challenge: PlanetChallenge, userName: string) {
    const time = Date.now();
    return {
      _id: `${this.idPrefix(challenge, userName)}:${COMPLETE_TASK_ID}`,
      challengeId: challenge._id,
      planetCode: this.stateService.configuration.code,
      user: userName,
      taskId: COMPLETE_TASK_ID,
      day: formatDate(new Date(time)),
      time
    };
  }

  private evidence(challenge: PlanetChallenge, task: ChallengeTask, user: any): Observable<Evidence[]> {
    const { start, end } = this.challengesService.challengeWindow(challenge);
    const inWindow = (time: number) => (!start || time >= start.getTime()) && (!end || time <= end.getTime());
    const code = this.stateService.configuration.code;
    const timeRange = { $gte: 0, ...(start ? { $gte: start.getTime() } : {}), ...(end ? { $lte: end.getTime() } : {}) };
    switch (task.type) {
      case 'course_join':
        // The shelf has no join time, so enrolment during the challenge counts
        return this.couchService.get(`shelf/${user._id}`).pipe(
          map(shelf => (shelf.courseIds || []).includes(task.targetId) ? [ { id: `shelf/${user._id}`, time: Date.now() } ] : [])
        );
      case 'course_complete':
        return forkJoin([
          this.couchService.get(`courses/${task.targetId}`),
          this.couchService.findAll('courses_progress', findDocuments({ userId: user._id, courseId: task.targetId, passed: true }))
        ]).pipe(map(([ course, progress ]: [ any, any[] ]) => {
          const stepCount = course.steps?.length || 0;
          const passedSteps = new Set(progress.map(doc => doc.stepNum));
          const finished = stepCount > 0 && Array.from({ length: stepCount }, (_, index) => index + 1).every(step => passedSteps.has(step));
          const last = progress.reduce((latest, doc) => doc.updatedDate > (latest?.updatedDate ?? -1) ? doc : latest, undefined);
          return finished && last && inWindow(last.updatedDate) ? [ { id: `courses_progress/${last._id}`, time: last.updatedDate } ] : [];
        }));
      case 'course_step':
        // A step can have several progress docs
        return this.couchService.findAll('courses_progress', findDocuments(
          { userId: user._id, courseId: task.targetId, passed: true }, [ '_id', 'stepNum', 'updatedDate' ]
        )).pipe(map((progress: any[]) => progress.filter(doc => inWindow(doc.updatedDate)).map(doc =>
          ({ id: `courses_progress/${doc._id}`, time: doc.updatedDate, unit: `${doc.stepNum}` })
        )));
      case 'survey_complete':
        return this.submissions(task, user, 'survey', timeRange);
      case 'exam_pass':
        return this.submissions(task, user, 'exam', timeRange);
      case 'voice_post':
      case 'voice_reply':
        return this.couchService.findAll('news', findDocuments({
          'user.name': user.name,
          time: timeRange,
          $or: [
            { messagePlanetCode: code, viewableBy: 'community' },
            { viewIn: { $elemMatch: { _id: planetAndParentId(this.stateService.configuration), section: 'community' } } }
          ]
        }, [ '_id', 'time', 'replyTo' ])).pipe(map((posts: any[]) => posts
          .filter(post => !!post.replyTo === (task.type === 'voice_reply'))
          .map(post => ({ id: `news/${post._id}`, time: post.time }))
        ));
      case 'login':
        return this.couchService.findAll('login_activities', findDocuments(
          { user: user.name, loginTime: timeRange, createdOn: code }, [ '_id', 'loginTime' ]
        )).pipe(map((logins: any[]) => logins.map(({ _id, loginTime }) =>
          ({ id: `login_activities/${_id}`, time: loginTime, unit: formatDate(new Date(loginTime)) })
        )));
      case 'resource_open':
        return this.couchService.findAll('resource_activities', findDocuments({
          user: user.name, time: timeRange, type: 'visit', createdOn: code, ...(task.targetId ? { resourceId: task.targetId } : {})
        }, [ '_id', 'time', 'resourceId' ])).pipe(map((visits: any[]) => visits.map(({ _id, time, resourceId }) =>
          ({ id: `resource_activities/${_id}`, time, unit: resourceId })
        )));
      case 'rating':
        // One rating doc per item, but deleting and rating again makes a new one
        return this.couchService.findAll('ratings', findDocuments(
          { 'user.name': user.name, type: { $in: [ 'course', 'resource' ] }, createdTime: timeRange, createdOn: code },
          [ '_id', 'createdTime', 'item' ]
        )).pipe(map((ratings: any[]) => ratings.map(({ _id, createdTime, item }) =>
          ({ id: `ratings/${_id}`, time: createdTime, unit: item })
        )));
      case 'team_join':
        // Membership has no join time either
        return this.couchService.findAll('teams', findDocuments(
          { docType: 'membership', userPlanetCode: code, userId: user._id, teamId: task.targetId }, [ '_id' ]
        )).pipe(map((memberships: any[]) => memberships.slice(0, 1).map(({ _id }) => ({ id: `teams/${_id}`, time: Date.now() }))));
      default:
        return of([]);
    }
  }

  private submissions(task: ChallengeTask, user: any, type: 'survey' | 'exam', timeRange: any): Observable<Evidence[]> {
    return this.couchService.findAll('submissions', findDocuments({
      'user.name': user.name,
      type,
      status: 'complete',
      parentId: task.courseId ? `${task.targetId}@${task.courseId}` : { $regex: `^${escapeRegex(task.targetId || '')}(@|$)` },
      lastUpdateTime: timeRange,
      // Some uploaded attempts carry no copy of the test, so they can't be judged
      ...(type === 'exam' ? { 'parent.questions': { $type: 'array' } } : {})
    }, [ '_id', 'lastUpdateTime', 'status', 'grade', 'parent.questions', 'parent.passingPercentage' ])).pipe(
      map((submissions: any[]) => submissions
        .filter(submission => type === 'survey' || attemptPasses(submission))
        .map(({ _id, lastUpdateTime }) => ({ id: `submissions/${_id}`, time: lastUpdateTime })))
    );
  }

  private openSuccessDialog(challenge: PlanetChallenge) {
    this.dialog.open(ChallengesAnnouncementSuccessDialogComponent, { width: '50vw', maxHeight: '100vh', data: challenge });
  }
}
