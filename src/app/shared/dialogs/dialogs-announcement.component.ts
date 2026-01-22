import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { Subject, of, Observable } from 'rxjs';
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

export const includedCodes = [ 'guatemala', 'san.pablo', 'xela', 'okuro', 'uriur', 'mutugi', 'vi' ];
export const challengeCourseId = '4e6b78800b6ad18b4e8b0e1e38a98cac';
export const examId = '4e6b78800b6ad18b4e8b0e1e38b382ab';
export const challengePeriod = (new Date() > new Date(2024, 10, 31)) && (new Date() < new Date(2025, 0, 16));

@Component({
  templateUrl: './dialogs-announcement-success.component.html',
  styleUrls: [ './dialogs-announcement.component.scss' ]
})
export class DialogsAnnouncementSuccessComponent { }

@Component({
  templateUrl: './dialogs-announcement.component.html',
  styleUrls: [ './dialogs-announcement.component.scss' ]
})
export class DialogsAnnouncementComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  configuration = this.stateService.configuration;
  teamId = planetAndParentId(this.stateService.configuration);
  submissions = [];
  groupSummary = [];
  members: any;
  enrolledMembers: any;
  courseId = challengeCourseId;
  startDate = new Date(2024, 10, 31);
  endDate = new Date(2024, 12, 1);
  isLoading = true;
  postStepValue = 2;
  courseStepValue = 0;
  surveyStepValue = 1;
  goal = 500;

  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private router: Router,
    private couchService: CouchService,
    private coursesService: CoursesService,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService,
    private userService: UserService,
    private userStatusService: UserChallengeStatusService
  ) {}

  ngOnInit() {
    if (includedCodes.includes(this.configuration.code)) {
      this.configuration = this.stateService.configuration;
      this.initializeData();
    } else {
      this.isLoading = false;
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  initializeData() {
    this.fetchMembers().subscribe(members => { this.members = members; });
    this.coursesService.requestCourses();
    this.newsService.requestNews({
      selectors: {
        '$or': [
          { messagePlanetCode: this.configuration.code, viewableBy: 'community' },
          { viewIn: { '$elemMatch': { '_id': this.teamId, section: 'community' } } }
        ]
      },
      viewId: this.teamId
    });
    this.fetchCourseAndNews();
    this.fetchEnrolledMembers();
  }

  joinCourse() {
    const courseTitle = this.coursesService.getCourseNameFromId(this.courseId);
    this.coursesService.courseResignAdmission(this.courseId, 'admission', courseTitle).subscribe((res) => {
      this.router.navigate([ `/courses/view/${this.courseId}/step/1` ]);
    }, (error) => ((error)));
    this.dialogRef.close();
  }

  doSurvey() {
    this.router.navigate([ `/courses/view/${this.courseId}/step/5/exam`, {
      id: this.courseId,
      stepNum: 5,
      questionNum: 1,
      type: 'survey',
      preview: 'false',
      examId: examId
    } ]);
    this.dialogRef.close();
  }

  shareVoice() {
    this.router.navigate([ '/' ]);
    this.dialogRef.close();
  }

  hasCompletedSurvey(userName: string): boolean {
    return this.submissions.some(submission => submission.name === userName && submission.status === 'complete');
  }

  hasSubmittedVoice(news: any[], userName: string): number {
    const uniqueDays = new Set<string>();

    news.forEach(post => {
      if (
      post.doc.user.name === userName &&
      post.doc.time > this.startDate &&
      post.doc.time < this.endDate &&
      !post.doc.replyTo
      ) {
        uniqueDays.add(new Date(post.doc.time).toDateString());
      }
    });
    return Math.min(uniqueDays.size, 5);
  }

  hasEnrolledCourse(member: any): boolean {
    return this.enrolledMembers.some(
      (enrolledMember) =>
        enrolledMember._id === member._id &&
        enrolledMember.courseIds?.includes(this.courseId)
    );
  }

  fetchMembers(): Observable<any[]> {
    return this.couchService.findAll('login_activities', findDocuments({
      type: 'login',
      loginTime: { $gte: this.startDate.getTime() }
    }, [ 'user' ])).pipe(
      catchError(() => of([])),
      map((res: any[]) => Array.from(new Set(res.map(doc => doc.user)))),
      switchMap(uniqueUsers => {
        if (uniqueUsers.length === 0) { return of([]); }
        return this.couchService.findAll(
          '_users',
          findDocuments({ name: { $in: uniqueUsers } }, [ '_id', 'name' ])
        );
      }),
      catchError(() => of([]))
    );
  }

  fetchEnrolledMembers() {
    this.couchService.findAll('shelf', {
      selector: { courseIds: { $elemMatch: { $eq: this.courseId } } },
    }).subscribe((members) => {
      this.enrolledMembers = members.map((member: any) => {
        const [ , memberName ] = member?._id.split(':');
        return {
          ...member,
          name: memberName,
        };
      });
    });
  }

  fetchGroupSummary(news) {
    this.members.forEach((member) => {
      const hasJoinedCourse = this.hasEnrolledCourse(member);
      const hasCompletedSurvey = this.hasCompletedSurvey(member.name);
      const userPosts = this.hasSubmittedVoice(news, member.name);

      if (!this.groupSummary.some(m => m.name === member.name)) {
        this.groupSummary.push({
          ...member,
          userPosts,
          courseAmount: hasJoinedCourse ? this.courseStepValue : 0,
          surveyAmount: hasCompletedSurvey ? this.surveyStepValue : 0
        });
      }
    });
  }

  fetchIndividualSummary(news) {
    this.userStatusService.updateStatus('surveyComplete', {
      status: this.hasCompletedSurvey(this.currentUserName),
      amount: this.surveyStepValue
    });
    this.userStatusService.updateStatus('hasPost', {
      status: this.hasSubmittedVoice(news, this.currentUserName) > 0,
      amount: this.postStepValue
    });
    this.userStatusService.updateStatus('userPosts', this.hasSubmittedVoice(news, this.currentUserName));
    this.members.some(member => {
      if (member.name === this.currentUserName) {
        this.userStatusService.updateStatus('joinedCourse', {
          status: this.hasEnrolledCourse(member),
          amount: this.courseStepValue
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
          const filteredSubmissions = submissions.filter(submission => submission.parentId.includes(this.courseId));
          this.submissions = filteredSubmissions.map(submission => ({
            name: submission.user.name,
            status: submission.status,
            time: submission.lastUpdateTime
          }));
          this.fetchGroupSummary(news);
          this.fetchIndividualSummary(news);
          this.isLoading = false;
        }, () => this.isLoading = false);
      }, () => this.isLoading = false);
  }

  getIndividualMoneyEarned(): number {
    const userStatus = this.userStatusService.printStatus();
    const postsEarnings = Number(userStatus.userPosts) * this.postStepValue;
    const courseAmount = userStatus.joinedCourse.status ? userStatus.joinedCourse.amount : 0;
    const surveyAmount = userStatus.surveyComplete.status ? userStatus.surveyComplete.amount : 0;
    return postsEarnings + courseAmount + surveyAmount;
  }

  getGroupMoneyEarned(): number {
    const totalEarned = this.groupSummary.reduce((total, member) => {
      const postAmount = Number(member.userPosts * this.postStepValue);
      const stepAmounts = member.courseAmount + member.surveyAmount;
      return total + (isNaN(postAmount) ? 0 : postAmount) + (isNaN(stepAmounts) ? 0 : stepAmounts);
    }, 0);
    return Math.min(totalEarned, this.goal);
  }

  getGoalPercentage(): number {
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
