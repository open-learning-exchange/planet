import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesComponent } from './courses.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';

const routes: Routes = [
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
  { path: '', component: CoursesComponent },
  { path: 'add', component: CoursesAddComponent },
  { path: 'request', component: CoursesRequestComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
<<<<<<< HEAD
=======
  { path: '', component: CoursesComponent},
  { path: 'add', component: CoursesAddComponent},
  { path: 'request', component: CoursesRequestComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
})
export class CoursesRouterModule {}
