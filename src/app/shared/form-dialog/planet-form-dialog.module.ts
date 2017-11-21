import { FormDialogService } from './form-dialog.service';
import { MaterialModule  } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormDialogComponent } from './form-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,MaterialModule, FormsModule, ReactiveFormsModule 
  ],
  exports: [
    FormDialogComponent
  ],
  declarations: [
    FormDialogComponent
  ],
  providers: [
    FormDialogService
  ],
  entryComponents: [
    FormDialogComponent
  ]
})
export class PlanetFormModule {}
