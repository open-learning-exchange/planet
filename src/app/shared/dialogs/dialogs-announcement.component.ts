import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { findDocuments } from '../../shared/mangoQueries';
import { CouchService } from '../couchdb.service';
import { CoursesService } from '../../courses/courses.service';
import { NewsService } from '../../news/news.service';
import { StateService } from '../state.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../user.service';
import { planetAndParentId } from '../../manager-dashboard/reports/reports.utils';

@Component({
  templateUrl: './dialogs-announcement.component.html',
  styleUrls: [ './dialogs-announcement.component.scss' ]
})
export class DialogsAnnouncementComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  configuration = this.stateService.configuration;
  teamId = planetAndParentId(this.stateService.configuration);
  submissionsSet = new Set();
  groupSummary = [];
  enrolledMembers: any;
  courseId = '9517e3b45a5bb63e69bb8f269216974d';
  startDate = new Date(2024, 9, 31);
  endDate = new Date(2024, 11, 1);
  userStatus = {
    joinedCourse: false,
    surveyComplete: false,
    hasPost: false,
  };

  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private router: Router,
    private couchService: CouchService,
    private coursesService: CoursesService,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const includedCodes = [ 'guatemala', 'san.pablo', 'xela', 'embakasi', 'uriur' ];

    if (includedCodes.includes(this.configuration.code)) {
      this.configuration = this.stateService.configuration;
      this.initializeData();
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
    this.fetchEnrolled();
  }

  joinCourse() {
    const courseTitle = this.coursesService.getCourseNameFromId(this.courseId);
    this.coursesService.courseResignAdmission(this.courseId, 'admission', courseTitle).subscribe((res) => {
      this.router.navigate([ '/courses/view', this.courseId ]);
    }, (error) => ((error)));
    this.dialogRef.close();
  }

  doSurvey() {
    this.router.navigate([ `/courses/view/${this.courseId}/step/3` ]);
    this.dialogRef.close();
  }

  postVoice() {
    this.router.navigate([ '/' ]);
    this.dialogRef.close();
  }

  fetchEnrolled() {
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

  hasCompletedSurvey(userName: string) {
    return this.submissionsSet.has(userName);
  }

  hasSubmittedVoice(news: any[], userName: string) {
    return news.some(post => {
      return (
      post.doc.user.name === userName &&
      post.doc.time > this.startDate &&
      post.doc.time < this.endDate
      );
    });
  }

  hasEnrolledCourse(member) {
    return member.courseIds.includes(this.courseId);
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
          this.submissionsSet = new Set(filteredSubmissions.map(submission => submission.user.name));

          // Group Summary
          this.enrolledMembers.forEach((member) => {
            const hasCompletedSurvey = this.hasCompletedSurvey(member.name);
            const hasPosted = this.hasSubmittedVoice(news, member.name);
            const hasJoinedCourse = this.hasEnrolledCourse(member);

            if (hasCompletedSurvey && hasPosted && hasJoinedCourse) {
              this.groupSummary.push(member);
            }
          });

          // Individual stats
          this.userStatus.surveyComplete = this.hasCompletedSurvey(this.currentUserName);
          this.userStatus.hasPost = this.hasSubmittedVoice(news, this.currentUserName);
          this.enrolledMembers.some(member => {
            if (member.name === this.currentUserName) {
              this.userStatus.joinedCourse = this.hasEnrolledCourse(member);
            }
          });
        });
      });
  }

  getGoalPercentage(): number {
    const goal = 500;
    return (this.groupSummary?.length / goal) * 100;
  }
}
