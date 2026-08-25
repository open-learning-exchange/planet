import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { environment } from '../../environments/environment';
import { NgClass } from '@angular/common';
import { Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { StateService } from './state.service';
import { couchAttachmentUrl } from './utils';

interface AvatarSource {
  db: '_users' | 'attachments';
  filename: string;
}

@Component({
  selector: 'planet-avatar',
  template: `
    @if (imgSrc) {
      <img [src]="imgSrc" [ngClass]="imgClass" (error)="imgLoadError()">
    }
    `,
  imports: [NgClass]
})
export class AvatarComponent implements OnChanges, OnDestroy {

  @Input() username: string;
  @Input() planetCode: string;
  @Input() imgClass: string;
  imgSrc: string;
  imgSources: AvatarSource[] = [];
  srcIndex = 0;
  imgUrlPrefix = environment.couchAddress;
  readonly filenames = [ 'img', 'img_' ];
  private readonly onDestroy$ = new Subject<void>();
  private waitingForConfiguration = false;

  constructor(private stateService: StateService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.username && !changes.planetCode) {
      return;
    }
    this.resolveAvatar();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  private resolveAvatar() {
    this.srcIndex = 0;
    this.imgSources = [];
    if (!this.username) {
      this.imgSrc = '';
      return;
    }
    if (this.planetCode && !this.stateService.configuration.code) {
      this.imgSrc = 'assets/image.png';
      this.waitForConfiguration();
      return;
    }
    // Remote avatars only live in attachments. Falling back to _users could show an unrelated
    // local user's avatar when both users share the same name.
    const db = this.isLocal() ? '_users' : 'attachments';
    this.imgSources = this.filenames.map(filename => ({ db, filename }));
    this.setImgSrc(this.imgSources[0]);
  }

  private waitForConfiguration() {
    if (this.waitingForConfiguration) {
      return;
    }
    this.waitingForConfiguration = true;
    this.stateService.couchStateListener('configurations').pipe(
      filter(({ planetField }) => planetField === 'local'),
      takeUntil(this.onDestroy$),
      take(1)
    ).subscribe(() => {
      this.waitingForConfiguration = false;
      if (this.planetCode) {
        this.resolveAvatar();
      }
    });
  }

  isLocal() {
    return !this.planetCode || this.planetCode === this.stateService.configuration.code;
  }

  imgLoadError() {
    if (!this.username) {
      return;
    }
    this.srcIndex = this.srcIndex + 1;
    if (this.srcIndex >= this.imgSources.length) {
      this.imgSrc = 'assets/image.png';
      return;
    }
    this.setImgSrc(this.imgSources[this.srcIndex]);
  }

  setImgSrc({ db, filename }: AvatarSource) {
    const docName = `org.couchdb.user:${this.username}${db === 'attachments' ? '@' + this.planetCode : ''}`;
    this.imgSrc = couchAttachmentUrl(this.imgUrlPrefix, db, docName, filename);
  }

}
