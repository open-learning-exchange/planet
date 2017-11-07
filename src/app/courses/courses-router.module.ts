import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesComponent } from './courses.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';

const routes: Routes = [
  { path: '', component: CoursesComponent },
  { path: 'add', component: CoursesAddComponent },
  { path: 'request', component: CoursesRequestComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CoursesRouterModule {}
