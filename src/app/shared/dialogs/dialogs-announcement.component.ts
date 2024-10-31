import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { findDocuments } from '../../shared/mangoQueries';
import { NewsService } from '../../news/news.service';
import { StateService } from '../state.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../user.service';

@Component({
  template: `
    <planet-markdown [content]="announcement"></planet-markdown>
  `
})
export class DialogsAnnouncementComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  configuration = this.stateService.configuration;
  userStatus = {
    courseComplete: false,
    surveyComplete: false,
    hasPost: false
  };
  announcement = `<img src="https://res.cloudinary.com/mutugiii/image/upload/v1730395098/challenge_horizontal_new_tnco4v.jpg" alt="issues challenge">`;


  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const includedCodes = [ 'guatemala', 'san.pablo', 'xela', 'embakasi', 'uriur', 'mutugi'];

    if (includedCodes.includes(this.configuration.code)) {
      this.fetchCourseAndNews()
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  fetchCourseAndNews() {
    const courseId = '9517e3b45a5bb63e69bb8f269216974d';

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
          const filteredSubmissions = submissions.filter(submission => submission.parentId.includes(courseId));
          const submissionsSet = new Set(filteredSubmissions.map(submission => submission.user.name));

          // Global Summary
          const filteredNews = news.filter((post) => {
            const userName = post.doc.user.name.toLowerCase();
            const isMatch = submissionsSet.has(userName) && (post.doc.time > new Date(2024, 9, 31));
            return isMatch;
          });

          // Individual Stats
          this.userStatus.surveyComplete = submissionsSet.has(this.currentUserName);
          this.userStatus.hasPost = submissionsSet.has(this.currentUserName) &&
                          news.some(post => new Date(post.doc.time) > new Date(2024, 9, 31));

          this.announcement += `
          \n - [] Unete al curso Reto noviembre.
          \n ${this.userStatus.surveyComplete ? '- [x]' : '- []'} ¡Encuesta finalizada!
          \n ${this.userStatus.hasPost ? '- [x]' : '- []'} Comparte tu opinión en Nuestras Voces.
          `;
          // \n Successful Challenge Submissions: ${filteredNews.length}
        });
      });
  }
}
