import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule } from '@angular/common/http';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { FeedbackViewComponent } from './feedback-view.component';
import { FeedbackComponent } from './feedback.component';
import { FeedbackRouterModule } from './feedback-router.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FeedbackRouterModule,
    MaterialModule,
    HttpClientModule,
    PlanetDialogsModule,
    SharedComponentsModule
  ],
  declarations: [ FeedbackComponent, FeedbackViewComponent ]
})
export class FeedbackModule {}
