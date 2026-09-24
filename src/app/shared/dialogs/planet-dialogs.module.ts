import { DialogsFormService } from './dialogs-form.service';
import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../forms/planet-forms.module';
import { SharedComponentsModule } from '../shared-components.module';
import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsPromptComponent } from './dialogs-prompt.component';
import { DialogsViewComponent } from './dialogs-view.component';
import { FeedbackDirective } from '../../feedback/feedback.directive';
import { DialogsListComponent } from './dialogs-list.component';
import { DialogsListService } from './dialogs-list.service';
import { DialogsLoadingComponent } from './dialogs-loading.component';
import { ChangePasswordDirective } from '../auth/change-password.directive';
import { SyncDirective } from '../../manager-dashboard/sync.directive';
import { MarkdownImagesDialogComponent } from '../markdown/markdown-images-dialog.component';
import {
  ChallengesAnnouncementDialogComponent, ChallengesAnnouncementSuccessDialogComponent
} from '../challenges/challenges-announcement-dialog.component';
import { PlanetRatingDialogComponent, PlanetRatingDialogDirective } from '../ratings/planet-rating-dialog.component';

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
