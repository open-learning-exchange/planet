import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetFormsModule } from '../../shared/forms/planet-forms.module';
import { CoursesViewDetailComponent, CoursesViewDetailDialogComponent } from './courses-view-detail.component';

@NgModule({
  imports: [
    CommonModule,
    PlanetFormsModule
  ],
  exports: [
    CoursesViewDetailComponent,
    CoursesViewDetailDialogComponent
  ],
  declarations: [
    CoursesViewDetailComponent,
    CoursesViewDetailDialogComponent
  ],
  entryComponents: [
    CoursesViewDetailDialogComponent
  ]
})
export class CoursesViewDetailModule {}
