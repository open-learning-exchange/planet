import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesComponent } from './courses.component';
import { CourseOpenComponent } from './open-course/course-open.component';
import { CourseResignComponent } from './resign-course/course-resign.component';
import { CourseManageComponent } from './manage-course/course-manage.component';
import { CourseViewComponent } from './view-course/course-view.component';
import { CourseCreditsComponent } from './credits-course/course-credits.component';
import { CourseProgressComponent } from './progress-course/course-progress.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';

const routes: Routes = [
  { path: '', component: CoursesComponent },
  { path: 'add', component: CoursesAddComponent },
  { path: 'request', component: CoursesRequestComponent },
  { path: 'open/:id', component: CourseOpenComponent },
  { path: 'resign/:id', component: CourseResignComponent },
  { path: 'manage/:id', component: CourseManageComponent },
  { path: 'view/:id', component: CourseViewComponent },
  { path: 'credits/:id', component: CourseCreditsComponent },
  { path: 'progress/:id', component: CourseProgressComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CoursesRouterModule {}
