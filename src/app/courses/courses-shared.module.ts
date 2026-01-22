import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CoursesIconComponent } from './courses-icon.component';
import { CoursesProgressBarComponent } from './progress-courses/courses-progress-bar.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule
  ],
  declarations: [
    CoursesIconComponent,
    CoursesProgressBarComponent
  ],
  exports: [
    CoursesIconComponent,
    CoursesProgressBarComponent
  ]
})
export class CoursesSharedModule {}
