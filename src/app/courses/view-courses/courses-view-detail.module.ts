import { NgModule } from '@angular/core';
import { MaterialModule } from '../../shared/material.module';
import { CommonModule } from '@angular/common';
import { PlanetFormsModule } from '../../shared/forms/planet-forms.module';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { CoursesViewDetailComponent, CoursesViewDetailDialogComponent } from './courses-view-detail.component';

@NgModule({
  imports: [
    CommonModule,
    PlanetFormsModule,
    MaterialModule,
    SharedComponentsModule
  ],
  exports: [
    CoursesViewDetailComponent,
    CoursesViewDetailDialogComponent
  ],
  declarations: [
    CoursesViewDetailComponent,
    CoursesViewDetailDialogComponent
  ]
})
export class CoursesViewDetailModule {}
