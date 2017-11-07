import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesComponent } from './courses.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';

const routes: Routes = [
<<<<<<< HEAD
  { path: '', component: CoursesComponent },
  { path: 'add', component: CoursesAddComponent },
  { path: 'request', component: CoursesRequestComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
=======
  { path: '', component: CoursesComponent},
  { path: 'add', component: CoursesAddComponent},
  { path: 'request', component: CoursesRequestComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
>>>>>>> Add courses list view (Fixes #83) (#107)
})
export class CoursesRouterModule {}
