import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { NewsService } from '../news/news.service';

@Component({
  templateUrl: './community.component.html',
  styleUrls: [ './community.scss' ]
})
export class CommunityComponent implements OnInit, OnDestroy {

  configuration = this.stateService.configuration;
  teamId = `${this.stateService.configuration.code}@${this.stateService.configuration.parentCode}`;
  news: any[] = [];
  onDestroy$ = new Subject<void>();

  constructor(
    private stateService: StateService,
    private newsService: NewsService
  ) {}

  ngOnInit() {
    this.newsService.requestNews({ viewableBy: 'teams', viewableId: this.teamId });
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

}
