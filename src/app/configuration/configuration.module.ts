import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfigurationComponent } from './configuration.component';
import { MaterialModule } from '../shared/material.module';

@NgModule({
  imports: [
    FormsModule, CommonModule, MaterialModule, ReactiveFormsModule
  ],
  declarations: [
    ConfigurationComponent
  ]
})
export class ConfigurationModule { }
