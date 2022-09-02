import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { head } from 'ramda';
import { formatTimeAgo } from '../../../helpers/timeFormat';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'planet-landing-news-detail',
  templateUrl: './newsitem-detail.component.html',
  styleUrls: [ './newsitem-detail.scss' ]
})
export class NewsItemDetailsComponent implements OnInit {
  baseUrl = environment.uplanetAddress;
  @Input() selectedDoc: any;
  @Output() closeDetailsEvent = new EventEmitter<any>();
  message: any;
  timeAgo: any;

  ngOnInit(): void {
    const { message, time, images, user } = this.selectedDoc;
    this.message = this.transformImage({ img: head(images) });

    this.message += message;
    this.timeAgo = formatTimeAgo(time);
  }

  clickCloseDetails() {
    this.closeDetailsEvent.emit();
  }

  transformImage({ img }) {
    const { markdown } = img;
    const splitUrl = markdown.split('](')[1].split(')')[0];

    return `![Noticia](${this.baseUrl}/pb/${splitUrl})`;
  }

  // (error)="$event.target.src = 'assets/landing-page/img/news-placeholder.png'"
}
