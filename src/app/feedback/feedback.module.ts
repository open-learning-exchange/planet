import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule,  ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { FeedbackComponent } from './feedback.component';
import { FeedbackRouterModule } from './feedback-router.module';
import { MaterialModule } from '../shared/material.module';
import { ViewfeedbackComponent } from './viewfeedback.component';

@NgModule({
  imports: [
    FeedbackRouterModule,
    FormsModule,
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    PlanetFormsModule
  ],
  declarations: [
    FeedbackComponent,
    ViewfeedbackComponent
  ]
})
export class FeedbackModule { }
