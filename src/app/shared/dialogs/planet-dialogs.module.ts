import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '@shared/material.module';
import { PlanetFormsModule } from '@shared/forms/planet-forms.module';
import { SharedComponentsModule } from '@shared/shared-components.module';
import { ChangePasswordDirective } from '@shared/auth/change-password.directive';
import { MarkdownImagesDialogComponent } from '@shared/markdown/markdown-images-dialog.component';
import {
  ChallengesAnnouncementDialogComponent, ChallengesAnnouncementSuccessDialogComponent
} from '@shared/challenges/challenges-announcement-dialog.component';
import { PlanetRatingDialogComponent, PlanetRatingDialogDirective } from '@shared/ratings/planet-rating-dialog.component';

import { DialogsFormService } from './dialogs-form.service';
import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsPromptComponent } from './dialogs-prompt.component';
import { DialogsViewComponent } from './dialogs-view.component';
import { FeedbackDirective } from '../../feedback/feedback.directive';
import { DialogsListComponent } from './dialogs-list.component';
import { DialogsListService } from './dialogs-list.service';
import { DialogsLoadingComponent } from './dialogs-loading.component';
import { SyncDirective } from '../../manager-dashboard/sync.directive';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    SharedComponentsModule,
    DialogsFormComponent,
    DialogsViewComponent,
    DialogsPromptComponent,
    FeedbackDirective,
    DialogsListComponent,
    DialogsLoadingComponent,
    MarkdownImagesDialogComponent,
    PlanetRatingDialogComponent,
    PlanetRatingDialogDirective,
    ChangePasswordDirective,
    SyncDirective,
    ChallengesAnnouncementDialogComponent,
    ChallengesAnnouncementSuccessDialogComponent
  ],
  exports: [
    DialogsFormComponent,
    DialogsViewComponent,
    DialogsPromptComponent,
    FeedbackDirective,
    DialogsListComponent,
    DialogsLoadingComponent,
    MarkdownImagesDialogComponent,
    PlanetRatingDialogComponent,
    PlanetRatingDialogDirective,
    ChangePasswordDirective,
    SyncDirective
  ],
  providers: [
    DialogsFormService,
    DialogsListService
  ]
})
export class PlanetDialogsModule {}
