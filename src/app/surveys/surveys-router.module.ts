import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SurveysComponent } from './surveys.component';
import { ExamsAddComponent } from '../exams/exams-add.component';
import { ExamsViewComponent } from '../exams/exams-view.component';

const routes: Routes = [
  { path: '', component: SurveysComponent },
  { path: 'add', component: ExamsAddComponent },
  { path: 'update/:id', component: ExamsAddComponent },
  { path: 'dispense', component: ExamsViewComponent, data: { newUser: true } },
  { path: 'submissions', loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule) }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class SurveysRouterModule {}
