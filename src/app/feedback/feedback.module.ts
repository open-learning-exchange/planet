import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../shared/material.module';
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
        PlanetDialogsModule,
        SharedComponentsModule,
        FeedbackComponent,
        FeedbackViewComponent
    ]
})
export class FeedbackModule { }
