import { Component, Input, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-avatar',
  template: `
    <img *ngIf="imgSrc" [src]="imgSrc" [ngClass]="imgClass" (error)="imgLoadError()">
  `
})
export class AvatarComponent implements OnInit {

  @Input() username: string;
  @Input() planetCode: string;
  @Input() imgClass: string;
  imgSrc: string;
  imgSources = [
    { db: 'attachments', filename: 'img' },
    { db: 'attachments', filename: 'img_' },
    { db: '_users', filename: 'img' },
    { db: '_users', filename: 'img_' }
  ];
  srcIndex = 0;
  imgUrlPrefix = environment.couchAddress;

  ngOnInit() {
    this.setImgSrc(this.imgSources[0]);
  }

  imgLoadError() {
    this.srcIndex = this.srcIndex + 1;
    if (this.srcIndex >= this.imgSources.length) {
      this.imgSrc = 'assets/image.png';
      return;
    }
    this.setImgSrc(this.imgSources[this.srcIndex]);
  }

  setImgSrc({ db, filename }) {
    const docName = `org.couchdb.user:${this.username}${db === 'attachments' ? '@' + this.planetCode : ''}`;
    this.imgSrc = `${this.imgUrlPrefix}/${db}/${docName}/${filename}`;
  }

}
