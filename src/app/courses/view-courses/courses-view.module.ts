import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { CoursesSharedModule } from '../courses-shared.module';
import { CoursesViewDetailModule } from './courses-view-detail.module';
import { SharedComponentsModule } from '../../shared/shared-components.module';

import { CoursesViewComponent } from './courses-view.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MatMenuModule,
    MatToolbarModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    CoursesSharedModule,
    CoursesViewDetailModule,
    SharedComponentsModule
  ],
  declarations: [
    CoursesViewComponent
  ],
  exports: [
    CoursesViewComponent
  ]
})
export class CoursesViewModule {}
