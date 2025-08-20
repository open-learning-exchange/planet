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
import { ChangePasswordDirective } from './change-password.directive';
import { SyncDirective } from '../../manager-dashboard/sync.directive';
import { DialogsImagesComponent } from './dialogs-images.component';
import { DialogsAnnouncementComponent, DialogsAnnouncementSuccessComponent } from './dialogs-announcement.component';
import { DialogsRatingsComponent, DialogsRatingsDirective } from './dialogs-ratings.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    SharedComponentsModule
  ],
  exports: [
    DialogsFormComponent,
    DialogsViewComponent,
    DialogsPromptComponent,
    FeedbackDirective,
    DialogsListComponent,
    DialogsLoadingComponent,
    DialogsImagesComponent,
    DialogsRatingsComponent,
    DialogsRatingsDirective,
    ChangePasswordDirective,
    SyncDirective
  ],
  declarations: [
    DialogsFormComponent,
    DialogsViewComponent,
    DialogsPromptComponent,
    FeedbackDirective,
    DialogsListComponent,
    DialogsLoadingComponent,
    DialogsImagesComponent,
    DialogsRatingsComponent,
    DialogsRatingsDirective,
    ChangePasswordDirective,
    SyncDirective,
    DialogsAnnouncementComponent,
    DialogsAnnouncementSuccessComponent
  ],
  providers: [
    DialogsFormService,
    DialogsListService
  ]
})
export class PlanetDialogsModule {}
