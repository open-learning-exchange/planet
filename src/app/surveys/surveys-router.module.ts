import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SurveysComponent } from './surveys.component';
import { ExamsAddComponent } from '../exams/exams-add.component';

const routes: Routes = [
  { path: '', component: SurveysComponent },
  { path: 'add', component: ExamsAddComponent },
  { path: 'update/:id', component: ExamsAddComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class SurveysRouterModule {}
