import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

import { StateService } from '@shared/state.service';
import { couchAttachmentUrl } from '@shared/utils';

import { environment } from '../../../environments/environment';

export interface AvatarAttachment {
  digest?: string;
}

export const avatarUrl = (db: '_users' | 'attachments', docId: string, digest?: string): string => {
  const url = couchAttachmentUrl(environment.couchAddress, db, docId, 'img');
  return digest ? `${url}?v=${encodeURIComponent(digest)}` : url;
};

@Component({
  selector: 'planet-avatar',
  template: `
    @if (imgSrc) {
      <img [src]="imgSrc" [alt]="alt" (error)="imgLoadError()">
    }
  `,
  styles: [`
    :host { display: inline-block; aspect-ratio: 1; }
    img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
  `]
})
export class AvatarComponent implements OnChanges, OnDestroy {

  @Input() username: string;
  @Input() planetCode: string;
  @Input() alt = '';
  @Input() attachment?: AvatarAttachment;
  @Output() imageError = new EventEmitter<void>();
  imgSrc: string;
  private readonly onDestroy$ = new Subject<void>();
  private waitingForConfiguration = false;

  constructor(private stateService: StateService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.username && !changes.planetCode && !changes.attachment) {
      return;
    }
    this.resolveAvatar();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  private resolveAvatar() {
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
    this.setImgSrc(this.isLocal() ? '_users' : 'attachments');
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
    if (!this.username || this.imgSrc === 'assets/image.png') {
      return;
    }
    this.imgSrc = 'assets/image.png';
    this.imageError.emit();
  }

  setImgSrc(db: '_users' | 'attachments') {
    const docName = `org.couchdb.user:${this.username}${db === 'attachments' ? '@' + this.planetCode : ''}`;
    this.imgSrc = avatarUrl(db, docName, this.attachment?.digest);
  }

}
