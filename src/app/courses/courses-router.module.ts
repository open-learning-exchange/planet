import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UnsavedChangesGuard } from '../shared/unsaved-changes.guard';

import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesComponent } from './courses.component';
import { CoursesViewComponent } from './view-courses/courses-view.component';
import { ExamsAddComponent } from '../exams/exams-add.component';
import { CoursesStepViewComponent } from './step-view-courses/courses-step-view.component';
import { ExamsViewComponent } from '../exams/exams-view.component';
import { CoursesProgressLeaderComponent } from './progress-courses/courses-progress-leader.component';
import { CoursesEnrollComponent } from './enroll-courses/courses-enroll.component';

const routes: Routes = [
  { path: '', component: CoursesComponent },
  { path: 'add', component: CoursesAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'update/:id', component: CoursesAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'view/:id/update', component: CoursesAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'view/:id', component: CoursesViewComponent },
  { path: 'exam', component: ExamsAddComponent },
  { path: 'survey', component: ExamsAddComponent },
  { path: 'view/:id/step/:stepNum', component: CoursesStepViewComponent, },
  { path: 'view/:id/step/:stepNum/exam', component: ExamsViewComponent },
  { path: 'update/exam/:id', component: ExamsAddComponent },
  { path: 'update/survey/:id', component: ExamsAddComponent },
  { path: 'progress/:id', component: CoursesProgressLeaderComponent },
  { path: 'enrolled/:id', component: CoursesEnrollComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CoursesRouterModule {}
