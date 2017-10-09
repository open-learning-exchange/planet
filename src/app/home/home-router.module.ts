import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from '../dashboard/dashboard.component';
import { UsersComponent } from '../users/users.component';
import { HomeComponent } from './home.component';
import { CoursesComponent } from '../courses/courses.component';

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: DashboardComponent},
      { path: 'users', component: UsersComponent},
      { path: 'courses', component: CoursesComponent },
      { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule'},
      { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule'}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRouterModule {}
