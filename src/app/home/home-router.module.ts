import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeComponent } from './home.component';
import { CommunityComponent } from '../community/community.component';
import { NationComponent } from '../nation/nation.component';
import { FeedbackComponent } from '../feedback/feedback.component';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';
import { NotificationsComponent } from '../notifications/notifications.component';

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'users', loadChildren: '../users/users.module#UsersModule' },
      { path: 'associated/:planet/:nation', component: NationComponent },
      { path: 'associated/:planet', component: NationComponent },
      { path: 'manager', component: ManagerDashboardComponent },
      { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule' },
      { path: 'requests', component: CommunityComponent },
      { path: 'feedback', component: FeedbackComponent },
      { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule' },
      { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule' },
      { path: 'notifications', component: NotificationsComponent }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
