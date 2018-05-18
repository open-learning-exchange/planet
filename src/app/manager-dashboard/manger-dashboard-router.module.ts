import { NgModule } from '@angular/core';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { Routes, RouterModule } from '@angular/router';
import { AddTeamComponent } from './add-team/add-team.component';
import { CreateNewTeamComponent } from './create-new-team/create-new-team.component';

const routes: Routes = [
  { path: '', component: ManagerDashboardComponent },
  { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule', data: { parent: true } },
  { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule', data: { parent: true } },
  { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule', data: { parent: true } },
  { path: 'manageteam', component: AddTeamComponent },
  { path: 'manageteam/createteam', component: CreateNewTeamComponent }
  ];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class ManagerDashboardRouterModule {}
