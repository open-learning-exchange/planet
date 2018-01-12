import { DialogsFormService } from './dialogs-form.service';
import { MaterialModule  } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsDeleteComponent } from './dialogs-delete.component';
import { DialogsMessageComponent } from './dialogs-message.component';
import { DialogsViewComponent } from './dialogs-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../planet-forms.module';

@NgModule({
  imports: [
    CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, PlanetFormsModule
  ],
  exports: [
    DialogsFormComponent, DialogsDeleteComponent, DialogsViewComponent, DialogsMessageComponent
  ],
  declarations: [
    DialogsFormComponent, DialogsDeleteComponent, DialogsViewComponent, DialogsMessageComponent
  ],
  providers: [
    DialogsFormService
  ],
  entryComponents: [
    DialogsFormComponent, DialogsDeleteComponent, DialogsViewComponent, DialogsMessageComponent
  ]
})
export class PlanetDialogsModule {}
