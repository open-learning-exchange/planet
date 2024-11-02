import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { findDocuments } from '../../shared/mangoQueries';
import { CouchService } from '../couchdb.service';
import { NewsService } from '../../news/news.service';
import { StateService } from '../state.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../user.service';

@Component({
  templateUrl: './dialogs-announcement.component.html',
  styleUrls: [ './dialogs-announcement.component.scss' ]
})
export class DialogsAnnouncementComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  configuration = this.stateService.configuration;
  challengers: any;
  enrolledMembers: any;
  // courseId = '9517e3b45a5bb63e69bb8f269216974d'
  courseId = 'd820952d159562a8a6602252390114a4'
  userStatus = {
    joinedCourse: false,
    surveyComplete: false,
    hasPost: false
  };

  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private couchService: CouchService,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const includedCodes = [ 'guatemala', 'san.pablo', 'xela', 'embakasi', 'uriur', 'mutugi'];

    if (includedCodes.includes(this.configuration.code)) {
      this.fetchCourseAndNews();
      this.fetchEnrolled();
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  joinCourse() {
    console.log('Joined Course');
  }

  fetchEnrolled() {
    this.couchService.findAll("shelf", {
      selector: { courseIds: { $elemMatch: { $eq: this.courseId } } },
    }).subscribe((members) => {
      this.enrolledMembers = members;
    });
  }

  fetchCourseAndNews() {
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe(news => {
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
          const submissionsSet = new Set(filteredSubmissions.map(submission => submission.user.name));

          // Global Summary
          const filteredNews = news.filter((post) => {
            const userName = post.doc.user.name.toLowerCase();
            const isMatch = submissionsSet.has(userName) && (
              (post.doc.time > new Date(2024, 9, 31)) &&
              (post.doc.time < new Date(2024, 11, 1))
            );
            return isMatch;
          });

          // Survey Completion Check
          this.userStatus.surveyComplete = submissionsSet.has(this.currentUserName);
          // Voices Check
          this.userStatus.hasPost =
              submissionsSet.has(this.currentUserName) &&
              news.some((post) => {
                return post.doc.time > new Date(2024, 9, 31) && post.doc.time < new Date(2024, 11, 1);
              });

          console.log('-----------------------------');
          console.log('-----------------------------');
          console.log(submissionsSet.has(this.currentUserName));
          console.log(news.some(post =>
            post.doc.time > new Date(2024, 9, 31) && post.doc.time < new Date(2024, 11, 1)
          ));

          console.log(submissionsSet.has(this.currentUserName) &&
          news.some((post) => {
            return post.doc.time > new Date(2024, 9, 31) && post.doc.time < new Date(2024, 11, 1);
          }));
          console.log('-----------------------------');
          console.log('-----------------------------');

          // Course Completion Check
          this.enrolledMembers.some((member) => {
            const [, extractedMemberName] = member._id.split(':');
            if (extractedMemberName === this.currentUserName && submissionsSet.has(extractedMemberName)) {
              member.courseIds.some((courseId) => {
                this.userStatus.joinedCourse = courseId === this.courseId ? true : false;
              });
            }
          });

          // console.log('-----------------------------');
          // console.log(submissionsSet);
          // console.log(this.challengers);
          // console.log(this.userStatus);
          // console.log('-----------------------------');

        });
      });
  }
}
