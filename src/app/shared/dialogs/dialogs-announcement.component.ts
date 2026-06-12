import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, of, Observable, forkJoin } from 'rxjs';
import { takeUntil, catchError, map, switchMap } from 'rxjs/operators';

import { findDocuments } from '../../shared/mangoQueries';
import { CouchService } from '../couchdb.service';
import { CoursesService } from '../../courses/courses.service';
import { NewsService } from '../../news/news.service';
import { StateService } from '../state.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../user.service';
import { UserChallengeStatusService } from '../user-challenge-status.service';
import { planetAndParentId } from '../../manager-dashboard/reports/reports.utils';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { NgClass } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatAnchor } from '@angular/material/button';
import { ChallengesService, PlanetChallenge } from '../challenges/challenges.service';

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
  styleUrls: ['./dialogs-announcement.component.scss']
})
export class DialogsAnnouncementSuccessComponent {
  challenge: PlanetChallenge;

  constructor(
    private challengesService: ChallengesService,
    @Inject(MAT_DIALOG_DATA) public data: PlanetChallenge | null,
  ) {
    this.challenge = this.challengesService.normalizeChallenge(data || this.challengesService.getActiveChallenge() || {});
  }
}

@Component({
  templateUrl: './dialogs-announcement.component.html',
  styleUrls: ['./dialogs-announcement.component.scss'],
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, NgClass, MatProgressSpinner, MatIcon, MatAnchor]
})
export class DialogsAnnouncementComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  configuration = this.stateService.configuration;
  teamId = planetAndParentId(this.stateService.configuration);
  challenge: PlanetChallenge;
  completedSurveyUserNames = new Set<string>();
  groupSummary = [];
  members: any;
  enrolledMemberIds = new Set<string>();
  courseId = '';
  surveyExamId = '';
  startDate: Date | undefined;
  endDate: Date | undefined;
  isLoading = true;
  voicePostReward = 2;
  joinCourseReward = 0;
  surveyCompletionReward = 1;
  maxDailyPosts = 5;
  goal = 500;
  dailyPostDots = [ 0, 1, 2, 3, 4 ];

  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private router: Router,
    private couchService: CouchService,
    private coursesService: CoursesService,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService,
    private userService: UserService,
    private userStatusService: UserChallengeStatusService,
    private challengesService: ChallengesService,
    @Inject(MAT_DIALOG_DATA) public data: PlanetChallenge | null
  ) {}

  ngOnInit() {
    this.challenge = this.challengesService.normalizeChallenge(this.data || this.challengesService.getActiveChallenge() || {});
    this.courseId = this.challenge.courseId;
    this.surveyExamId = this.challenge.surveyExamId;
    this.startDate = this.getDate(this.challenge.startsAt);
    this.endDate = this.getDate(this.challenge.endsAt);
    if (this.startDate && this.challenge.startsAt?.length <= 10) {
      this.startDate.setHours(0, 0, 0, 0);
    }
    if (this.endDate && this.challenge.endsAt?.length <= 10) {
      this.endDate.setHours(23, 59, 59, 999);
    }
    this.voicePostReward = this.challenge.voicePostReward ?? 2;
    this.joinCourseReward = this.challenge.joinCourseReward ?? 0;
    this.surveyCompletionReward = this.challenge.surveyCompletionReward ?? 1;
    this.maxDailyPosts = this.challenge.maxDailyPosts ?? 5;
    this.goal = this.challenge.goal ?? 500;
    this.dailyPostDots = Array.from({ length: Math.max(0, this.maxDailyPosts) }, (_, index) => index);

    if (!this.challenge.courseId || !this.challenge.surveyExamId) {
      this.isLoading = false;
      return;
    }
    this.configuration = this.stateService.configuration;
    this.initializeData();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  initializeData() {
    this.coursesService.requestCourses();
    forkJoin([ this.fetchMembers(), this.fetchEnrolledMembers() ]).pipe(
      takeUntil(this.onDestroy$)
    ).subscribe(([ members, enrolledMemberIds ]) => {
      this.members = members;
      this.enrolledMemberIds = enrolledMemberIds;
      this.fetchCourseAndNews();
      this.newsService.requestNews({
        selectors: {
          '$or': [
            { messagePlanetCode: this.configuration.code, viewableBy: 'community' },
            { viewIn: { '$elemMatch': { '_id': this.teamId, section: 'community' } } }
          ]
        },
        viewId: this.teamId
      });
    }, () => this.isLoading = false);
  }

  joinCourse() {
    const courseTitle = this.coursesService.getCourseNameFromId(this.courseId);
    this.coursesService.courseResignAdmission(this.courseId, 'admission', courseTitle).subscribe((res) => {
      this.router.navigate([ `/courses/view/${this.courseId}/step/1` ]);
    }, (error) => ((error)));
    this.dialogRef.close();
  }

  doSurvey() {
    const stepNum = this.getSurveyStepNum();
    this.router.navigate([ `/courses/view/${this.courseId}/step/${stepNum}/exam`, {
      id: this.courseId,
      stepNum,
      questionNum: 1,
      type: 'survey',
      preview: 'false',
      examId: this.surveyExamId
    } ]);
    this.dialogRef.close();
  }

  getSurveyStepNum() {
    const course = this.coursesService.course?._id === this.courseId ?
      this.coursesService.course :
      this.coursesService.local.courses.find((localCourse: any) => localCourse._id === this.courseId);
    const surveyStepIndex = course?.steps?.findIndex((step: any) => step.survey?._id === this.surveyExamId);
    return surveyStepIndex > -1 ? surveyStepIndex + 1 : 5;
  }

  getDate(value: string | undefined) {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  shareVoice() {
    this.router.navigate([ '/' ]);
    this.dialogRef.close();
  }

  hasCompletedSurvey(userName: string): boolean {
    return this.completedSurveyUserNames.has(userName);
  }

  hasSubmittedVoice(news: any[], userName: string): number {
    const uniqueDays = new Set<string>();

    news.forEach(post => {
      if (
        post.doc.user.name === userName &&
        (!this.startDate || post.doc.time > this.startDate) &&
        (!this.endDate || post.doc.time < this.endDate) &&
        !post.doc.replyTo
      ) {
        uniqueDays.add(new Date(post.doc.time).toDateString());
      }
    });
    return Math.min(uniqueDays.size, this.maxDailyPosts);
  }

  hasEnrolledCourse(member: any): boolean {
    return this.enrolledMemberIds.has(member._id);
  }

  fetchMembers(): Observable<any[]> {
    return this.couchService.findAll('login_activities', findDocuments({
      type: 'login',
      ...(this.startDate ? { loginTime: { $gte: this.startDate.getTime() } } : {})
    }, [ 'user' ])).pipe(
      catchError(() => of([])),
      map((res: any[]) => Array.from(new Set(res.map(doc => doc.user)))),
      switchMap(uniqueUsers => {
        if (uniqueUsers.length === 0) {
          return of([]);
        }
        return this.couchService.findAll(
          '_users',
          findDocuments({ name: { $in: uniqueUsers } }, [ '_id', 'name' ])
        );
      }),
      catchError(() => of([]))
    );
  }

  fetchEnrolledMembers(): Observable<Set<string>> {
    return this.couchService.findAll('shelf', {
      selector: { courseIds: { $elemMatch: { $eq: this.courseId } } },
    }).pipe(
      map((members: any[]) => new Set<string>(members.map((member: any) => member._id)))
    );
  }

  fetchGroupSummary(news) {
    const enrolledMemberIds = new Set(
      this.enrolledMembers
        .filter(em => em.courseIds?.includes(this.courseId))
        .map(em => em._id)
    );

    const completedSurveyUserNames = new Set(
      this.submissions
        .filter(s => s.status === 'complete')
        .map(s => s.name)
    );

    const uniqueDaysByUser = new Map<string, Set<string>>();
    news.forEach(post => {
      if (
        post.doc.time > this.startDate &&
        post.doc.time < this.endDate &&
        !post.doc.replyTo
      ) {
        const userName = post.doc.user.name;
        let days = uniqueDaysByUser.get(userName);
        if (!days) {
          days = new Set();
          uniqueDaysByUser.set(userName, days);
        }
        days.add(new Date(post.doc.time).toDateString());
      }
    });

    const addedMembers = new Set<string>(this.groupSummary.map(m => m.name));

    this.members.forEach((member) => {
      const hasJoinedCourse = enrolledMemberIds.has(member._id);
      const hasCompletedSurvey = completedSurveyUserNames.has(member.name);

      const userDays = uniqueDaysByUser.get(member.name);
      const userPosts = userDays ? Math.min(userDays.size, 5) : 0;

      if (!addedMembers.has(member.name)) {
        addedMembers.add(member.name);
        this.groupSummary.push({
          ...member,
          userPosts,
          courseAmount: hasJoinedCourse ? this.joinCourseReward : 0,
          surveyAmount: hasCompletedSurvey ? this.surveyCompletionReward : 0
        });
      }
    });
  }

  fetchIndividualSummary(news) {
    this.userStatusService.updateStatus('surveyComplete', {
      status: this.hasCompletedSurvey(this.currentUserName),
      amount: this.surveyCompletionReward
    });
    this.userStatusService.updateStatus('hasPost', {
      status: this.hasSubmittedVoice(news, this.currentUserName) > 0,
      amount: this.voicePostReward
    });
    this.userStatusService.updateStatus('userPosts', this.hasSubmittedVoice(news, this.currentUserName));
    this.members.some(member => {
      if (member.name === this.currentUserName) {
        this.userStatusService.updateStatus('joinedCourse', {
          status: this.hasEnrolledCourse(member),
          amount: this.joinCourseReward
        });
      }
    });
  }

  fetchCourseAndNews() {
    this.newsService.newsUpdated$.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe(news => {
      news.map(post => ({
        ...post,
        public: (
          (post.doc.viewIn || []).find(
            (view) =>
              view._id ===
              `${this.configuration.code}@${this.configuration.parentCode}`
          ) || {}
        ).public,
      }));
      this.submissionsService.getSubmissions(findDocuments({ type: 'survey' }))
        .subscribe((submissions: any[]) => {
          this.completedSurveyUserNames = new Set(
            submissions
              .filter(s => s.parentId.includes(this.courseId) && s.status === 'complete')
              .map(s => s.user.name)
          );
          this.fetchGroupSummary(news);
          this.fetchIndividualSummary(news);
          this.isLoading = false;
        }, () => this.isLoading = false);
    }, () => this.isLoading = false);
  }

  getIndividualMoneyEarned(): number {
    const userStatus = this.userStatusService.printStatus();
    const postsEarnings = Number(userStatus.userPosts) * this.voicePostReward;
    const courseAmount = userStatus.joinedCourse.status ? userStatus.joinedCourse.amount : 0;
    const surveyAmount = userStatus.surveyComplete.status ? userStatus.surveyComplete.amount : 0;
    return postsEarnings + courseAmount + surveyAmount;
  }

  getGroupMoneyEarned(): number {
    const totalEarned = this.groupSummary.reduce((total, member) => {
      const postAmount = Number(member.userPosts * this.voicePostReward);
      const stepAmounts = member.courseAmount + member.surveyAmount;
      return total + (isNaN(postAmount) ? 0 : postAmount) + (isNaN(stepAmounts) ? 0 : stepAmounts);
    }, 0);
    return Math.min(totalEarned, this.goal);
  }

  getGoalPercentage(): number {
    if (this.goal <= 0) {
      return 0;
    }
    const totalMoneyEarned = this.getGroupMoneyEarned();
    return (totalMoneyEarned / this.goal) * 100;
  }

  getStatus(key: string) {
    return this.userStatusService.getStatus(key);
  }

  getPosts() {
    return this.userStatusService.getPosts();
  }
}
