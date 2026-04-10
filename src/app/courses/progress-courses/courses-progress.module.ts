import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../shared/material.module';
import { PlanetFormsModule } from '../../shared/forms/planet-forms.module';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { CoursesProgressBarComponent } from './courses-progress-bar.component';
import { CoursesProgressChartComponent } from './courses-progress-chart.component';
import { CoursesProgressLeaderComponent } from './courses-progress-leader.component';
import { CoursesProgressLearnerComponent } from './courses-progress-learner.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    PlanetFormsModule,
    SharedComponentsModule
  ],
  declarations: [
    CoursesProgressBarComponent,
    CoursesProgressChartComponent,
    CoursesProgressLeaderComponent,
    CoursesProgressLearnerComponent
  ],
  exports: [
    CoursesProgressBarComponent,
    CoursesProgressChartComponent,
    CoursesProgressLeaderComponent,
    CoursesProgressLearnerComponent
  ]
})
export class CoursesProgressModule {}
