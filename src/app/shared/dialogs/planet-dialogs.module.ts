import { DialogsFormService } from './dialogs-form.service';
import { MaterialModule  } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsPromptComponent } from './dialogs-prompt.component';
import { DialogsViewComponent } from './dialogs-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../planet-forms.module';
import { FeedbackDirective } from '../../feedback/feedback.directive';
import { DialogsListComponent } from './dialogs-list.component';
import { DialogsListService } from './dialogs-list.service';
import { DialogsLoadingComponent } from './dialogs-loading.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, PlanetFormsModule
  ],
  exports: [
    DialogsFormComponent, DialogsViewComponent, DialogsPromptComponent, FeedbackDirective, DialogsListComponent, DialogsLoadingComponent
  ],
  declarations: [
    DialogsFormComponent, DialogsViewComponent, DialogsPromptComponent, FeedbackDirective, DialogsListComponent, DialogsLoadingComponent
  ],
  providers: [
    DialogsFormService, DialogsListService
  ],
  entryComponents: [
    DialogsFormComponent, DialogsViewComponent, DialogsPromptComponent, DialogsListComponent, DialogsLoadingComponent
  ]
})
export class PlanetDialogsModule {}
