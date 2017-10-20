import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesaddComponent } from './add/coursesadd.component';
import { CoursesComponent } from './courses.component';
import { CoursesrequestComponent } from './request/coursesrequest.component';

const routes: Routes = [
    { path: '', component: CoursesComponent},
    { path: 'add', component: CoursesaddComponent},
    { path: 'request', component: CoursesrequestComponent}
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CoursesRouterModule {}
