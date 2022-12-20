import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { head } from 'ramda';
import { formatTimeAgo } from '../../../helpers/timeFormat';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'planet-landing-card-item',
  templateUrl: './newscard-item.component.html',
  styleUrls: [ './newscard-item.scss' ]
})
export class NewsCardItemComponent implements OnInit {
  private baseUrl = environment.uplanetAddress;
  @Input() doc: any;
  @Output() seeDetailsEvent = new EventEmitter<any>();
  message: any;
  timeAgo: any;
  imageUrl: any;

  ngOnInit(): void {
    const { message, time, user, images } = this.doc;
    this.message = message;
    this.timeAgo = formatTimeAgo(time);

    this.imageUrl = this.useNewImage({ img: head(images), user });
  }

  clickSeeDetails() {
    this.seeDetailsEvent.emit(this.doc._id);
  }

  useNewImage({ img, user: { _id: userId } = { _id: null } }) {
    if (img) {
      const { resourceId, filename } = img;
      return `${this.baseUrl}/pb/resources/${resourceId}/${filename}`;
    }

    return userId ? `${this.baseUrl}/pb/_users/${userId}/img_` : 'assets/landing-page/img/news-placeholder.png';
  }
}
