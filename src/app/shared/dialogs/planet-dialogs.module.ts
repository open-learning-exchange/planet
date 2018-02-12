import { DialogsFormService } from './dialogs-form.service';
import { MaterialModule  } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsDeleteComponent } from './dialogs-delete.component';
import { DialogsViewComponent } from './dialogs-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../planet-forms.module';
import { DialogsChangeComponent } from './dialogs-change.component';
@NgModule({
  imports: [
    CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, PlanetFormsModule
  ],
  exports: [
    DialogsFormComponent, DialogsDeleteComponent, DialogsViewComponent, DialogsChangeComponent
  ],
  declarations: [
    DialogsFormComponent, DialogsDeleteComponent, DialogsViewComponent, DialogsChangeComponent
  ],
  providers: [
    DialogsFormService
  ],
  entryComponents: [
    DialogsFormComponent, DialogsDeleteComponent, DialogsViewComponent, DialogsChangeComponent
  ]
})
export class PlanetDialogsModule {}
