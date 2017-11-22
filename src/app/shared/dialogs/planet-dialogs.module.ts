import { DialogsFormService } from './dialogs-form.service';
import { MaterialModule  } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsDeleteComponent } from './dialogs-delete.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../planet-forms.module';

@NgModule({
  imports: [
    CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, PlanetFormsModule
  ],
  exports: [
    DialogsFormComponent, DialogsDeleteComponent
  ],
  declarations: [
    DialogsFormComponent, DialogsDeleteComponent
  ],
  providers: [
    DialogsFormService
  ],
  entryComponents: [
    DialogsFormComponent, DialogsDeleteComponent
  ]
})
export class PlanetDialogsModule {}
