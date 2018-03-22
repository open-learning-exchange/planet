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

@NgModule({
  imports: [
    CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, PlanetFormsModule
  ],
  exports: [
    DialogsFormComponent, DialogsViewComponent, DialogsPromptComponent, FeedbackDirective
  ],
  declarations: [
    DialogsFormComponent, DialogsViewComponent, DialogsPromptComponent, FeedbackDirective
  ],
  providers: [
    DialogsFormService
  ],
  entryComponents: [
    DialogsFormComponent, DialogsViewComponent, DialogsPromptComponent
  ]
})
export class PlanetDialogsModule {}
