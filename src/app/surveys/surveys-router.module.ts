import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SurveysComponent } from './surveys.component';
import { ExamsAddComponent } from '../exams/exams-add.component';
import { ExamsViewComponent } from '../exams/exams-view.component';
import { UnsavedChangesGuard } from '@shared/unsaved-changes/unsaved-changes.guard';

const routes: Routes = [
  { path: '', component: SurveysComponent },
  { path: 'add', component: ExamsAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'update/:id', component: ExamsAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'dispense', component: ExamsViewComponent, data: { newUser: true }, canDeactivate: [UnsavedChangesGuard] }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class SurveysRouterModule {}
