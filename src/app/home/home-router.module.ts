import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from '../dashboard/dashboard.component';
import { UsersComponent } from '../users/users.component';
import { HomeComponent } from './home.component';
import { CommunityComponent } from '../community/community.component';
import { NationComponent } from '../nation/nation.component';

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'nation', component: NationComponent },
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule' },
=======
      { path: 'courses', component: CoursesComponent },
>>>>>>> Bracket spacing rule for linting (Fixes #150) (#153)
=======
      { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule' },
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
      { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule' },
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
      { path: 'community', component: CommunityComponent },
      { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule' },
      { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule' }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
