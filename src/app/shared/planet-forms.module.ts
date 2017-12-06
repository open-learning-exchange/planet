import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module';
import { FormErrorMessagesComponent } from './form-error-messages.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    FormErrorMessagesComponent
  ],
  declarations: [
    FormErrorMessagesComponent
  ]
})
export class PlanetFormsModule {}
