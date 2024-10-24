import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NewsService } from '../../news/news.service';
import { findDocuments } from '../../shared/mangoQueries';
import { SubmissionsService } from '../../submissions/submissions.service';

@Component({
  template: `
    <planet-markdown [content]="announcement"></planet-markdown>
  `
})
export class DialogsAnnouncementComponent implements OnInit{

  private onDestroy$ = new Subject<void>();
  announcement = `
  ## Planet issues challenge

  <img src="https://meetgor-cdn.pages.dev/github-filter-issues.png" alt="issues challenge" width="350" height="250">

  Get ready for virtual intern github issues challenge!

  **Duration:** 30 days

  ## Steps to participate:
  - Find an issue on Planet
  - Take a screenshot/record a video
  - Create an issue on our github repository using link below

  [open new Planet issue](https://github.com/open-learning-exchange/planet/issues/new)
  `;


  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private newsService: NewsService,
    private submissionsService: SubmissionsService
  ) {}

  ngOnInit() {
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe(news => {
      news.map(post => ({
      ...post, public: ((post.doc.viewIn || []).find(view => view._id === 'mutugi@vi') || {}).public
      }));

      this.submissionsService.getSubmissions(findDocuments({ type: 'survey' }))
      .subscribe((submissions: any[]) => {
        const filteredSubmissions = submissions.filter(submission => submission.parentId.includes('d820952d159562a8a6602252390114a4'));
        const submissionsSet = new Set(filteredSubmissions.map(submission => submission.user.name));

        const filteredNews = news.filter((post) => {
          const userName = post.doc.user.name.toLowerCase();
          const isMatch = submissionsSet.has(userName);
          return isMatch;
        });

        this.announcement += `\n\n Challenge Submissions: ${filteredNews.length}`;
      });
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
