import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';

import { ChallengesAnnouncementComponent } from './challenges-announcement.component';
import { ChallengesProgressService, UserProgress } from './challenges-progress.service';
import { ChallengesService, PlanetChallenge } from './challenges.service';

@Component({
  template: `
    <div class="announcement-container">
      @if (coverImageUrl) {
        <img
          [src]="coverImageUrl"
          [alt]="challenge.title"
          class="announcement-banner"
        />
      }
      <p class="success-msg">{{ challenge.successMessage }}</p>
    </div>
  `,
  styleUrls: ['./challenges-announcement.component.scss']
})
export class ChallengesAnnouncementSuccessDialogComponent {
  challenge: PlanetChallenge;
  coverImageUrl: string;

  constructor(
    private challengesService: ChallengesService,
    @Inject(MAT_DIALOG_DATA) public data: PlanetChallenge | null,
  ) {
    this.challenge = this.challengesService.normalizeChallenge(data || {});
    this.coverImageUrl = this.challengesService.coverImageUrl(this.challenge);
  }
}

@Component({
  template: `
    <h2 mat-dialog-title i18n>Announcement</h2>
    <mat-dialog-content>
      <planet-challenges-announcement [challenge]="challenge" [progress]="progress" [groupEarned]="groupEarned"
        [preview]="isPreview" (leave)="dialogRef.close()"></planet-challenges-announcement>
    </mat-dialog-content>
  `,
  imports: [MatDialogTitle, MatDialogContent, ChallengesAnnouncementComponent]
})
export class ChallengesAnnouncementDialogComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  challenge: PlanetChallenge;
  progress: UserProgress | undefined;
  progressLoaded = false;
  groupEarned = 0;
  isPreview = !this.challengesProgressService.canTakePart();

  constructor(
    public dialogRef: MatDialogRef<ChallengesAnnouncementDialogComponent>,
    private challengesService: ChallengesService,
    private challengesProgressService: ChallengesProgressService,
    @Inject(MAT_DIALOG_DATA) public data: PlanetChallenge | null
  ) {}

  ngOnInit() {
    this.challenge = this.challengesService.normalizeChallenge(this.data || {});
    this.challengesProgressService.refresh(this.challenge).pipe(
      map(({ progress }) => ({ progress, progressLoaded: true })),
      catchError(() => of({ progress: this.challengesProgressService.userProgress(this.challenge, []), progressLoaded: false })),
      switchMap(loaded => this.challengesProgressService.groupEarned(this.challenge).pipe(
        catchError(() => of(0)),
        map(groupEarned => ({ ...loaded, groupEarned }))
      )),
      takeUntil(this.onDestroy$)
    ).subscribe(({ progress, progressLoaded, groupEarned }) => {
      Object.assign(this, { progress, progressLoaded, groupEarned });
    });
  }

  needsReminder() {
    return this.progressLoaded && !this.isPreview && !this.progress.complete;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
