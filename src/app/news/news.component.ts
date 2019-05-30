import { Component, OnInit, OnDestroy } from '@angular/core';
import { StateService } from '../shared/state.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NewsService } from './news.service';

@Component({
  templateUrl: './news.component.html',
  styleUrls: [ './news.scss' ]
})
export class NewsComponent implements OnInit, OnDestroy {

  configuration = this.stateService.configuration;
  newsItems: any[] = [];
  newMessage = '';
  private onDestroy$ = new Subject<void>();

  constructor(
    private stateService: StateService,
    private newsService: NewsService
  ) {}

  ngOnInit() {
    this.getMessages();
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.newsItems = news);
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getMessages() {
    this.newsService.requestNews({ createdOn: this.configuration.code, viewableBy: 'community' });
  }

  postMessage() {
    this.postNews({
      message: this.newMessage,
      viewableBy: 'community'
    });
  }

  postNews(data, successMessage?) {
    this.newsService.postNews(data, successMessage).subscribe(() => {
      this.newMessage = '';
    });
  }

}
