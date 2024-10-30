import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NewsService } from '../../news/news.service';
import { findDocuments } from '../../shared/mangoQueries';
import { SubmissionsService } from '../../submissions/submissions.service';
import { StateService } from '../state.service';

@Component({
  template: `
    <planet-markdown [content]="announcement"></planet-markdown>
  `
})
export class DialogsAnnouncementComponent implements OnInit{

  private onDestroy$ = new Subject<void>();
  excludedCodes = ['earth', 'somalia', 'learning'];
  configuration = this.stateService.configuration;
  announcement = `
  ## November Community challenge

  <img src="https://res.cloudinary.com/mutugiii/image/upload/v1730234589/challenge_lrlujq.png" alt="issues challenge">

  ## Steps to participate:
  - Question: What are you interested in researching
  - Research: Use the AI chat feature to research your question
  - Report & share - Write a message on what you learned and share it in the Community Voices.
  `;


  constructor(
    public dialogRef: MatDialogRef<DialogsAnnouncementComponent>,
    private newsService: NewsService,
    private stateService: StateService,
    private submissionsService: SubmissionsService
  ) {}

  ngOnInit() {
    // Manually set the planets and courseId
    const excludedCodes = ['earth', 'somalia', 'learning'];
    const courseId = '';

    if (!excludedCodes.includes(this.configuration.code)) {
      this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe(news => {
        news.map(post => ({
        ...post, public: ((post.doc.viewIn || []).find(view => view._id === `${this.configuration.code}@${this.configuration.parentCode}`) || {}).public
        }));

        this.submissionsService.getSubmissions(findDocuments({ type: 'survey' }))
        .subscribe((submissions: any[]) => {
          const filteredSubmissions = submissions.filter(submission => submission.parentId.includes(courseId));
          const submissionsSet = new Set(filteredSubmissions.map(submission => submission.user.name));

          const filteredNews = news.filter((post) => {
            const userName = post.doc.user.name.toLowerCase();
            console.log(userName);

            const isMatch = submissionsSet.has(userName);
            return isMatch;
          });

          this.announcement += `\n\n Successful Challenge Submissions: ${filteredNews.length}`;
        });
      });
    };
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
