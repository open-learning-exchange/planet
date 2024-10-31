import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { findDocuments } from '../../shared/mangoQueries';
import { NewsService } from '../../news/news.service';
import { StateService } from '../state.service';
import { SubmissionsService } from '../../submissions/submissions.service';

@Component({
  template: `
    <planet-markdown [content]="announcement"></planet-markdown>
  `
})
export class DialogsAnnouncementComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  configuration = this.stateService.configuration;
  announcement = `
  <img src="https://res.cloudinary.com/mutugiii/image/upload/v1730309598/challenge_horizontal_xppnfl.jpg" alt="issues challenge">

  - Unete al curso Reto noviembre.
  - Comparte tu opinión en Nuestras Voces.
  `;


  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService
  ) {}

  ngOnInit() {
    // Manually set the planets and courseId
    const includedCodes = [ 'guatemala', 'san.pablo', 'xela', 'embakasi', 'uriur' ];
    const courseId = '';

    if (includedCodes.includes(this.configuration.code)) {
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

          const filteredNews = news.filter((post) => {
            const userName = post.doc.user.name.toLowerCase();
            const isMatch = submissionsSet.has(userName);
            return isMatch;
          });

          // this.announcement += `\n\n Successful Challenge Submissions: ${filteredNews.length}`;
        });
      });
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
