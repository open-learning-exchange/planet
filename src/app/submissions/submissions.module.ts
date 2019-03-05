import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { SubmissionsComponent } from './submissions.component';
import { ExamsViewComponent } from '../exams/exams-view.component';
import { ExamsModule } from '../exams/exams.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

const routes: Routes = [
  { path: '', component: SubmissionsComponent },
  { path: 'exam', component: ExamsViewComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class SubmissionsRouterModule {}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    ExamsModule,
    SubmissionsRouterModule,
    SharedComponentsModule
  ],
  declarations: [
    SubmissionsComponent
  ]
})
export class SubmissionsModule {}
