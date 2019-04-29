import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeComponent } from './home.component';
import { CommunityComponent } from '../community/community.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { SubmissionsComponent } from '../submissions/submissions.component';
import { SubmissionsModule } from '../submissions/submissions.module';
import { UpgradeComponent } from '../upgrade/upgrade.component';
import { UsersAchievementsComponent } from '../users/users-achievements/users-achievements.component';
import { UsersAchievementsUpdateComponent } from '../users/users-achievements/users-achievements-update.component';
import { NewsComponent } from '../news/news.component';

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'users', loadChildren: '../users/users.module#UsersModule' },
      { path: 'manager', loadChildren: '../manager-dashboard/manager-dashboard.module#ManagerDashboardModule' },
      { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule' },
      { path: 'requests', component: CommunityComponent },
      { path: 'feedback', loadChildren: '../feedback/feedback.module#FeedbackModule' },
      { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule' },
      { path: 'myLibrary', loadChildren: '../resources/resources.module#ResourcesModule', data: { myLibrary: true } },
      { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule' },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'submissions', loadChildren: '../submissions/submissions.module#SubmissionsModule' },
      { path: 'submissions/:type', loadChildren: '../submissions/submissions.module#SubmissionsModule' },
      { path: 'mySurveys', loadChildren: '../submissions/submissions.module#SubmissionsModule', data: { mySurveys: true } },
      { path: 'upgrade', component: UpgradeComponent },
      { path: 'upgrade/myplanet', component: UpgradeComponent, data: { myPlanet: true } },
      { path: 'teams', loadChildren: '../teams/teams.module#TeamsModule' },
      { path: 'surveys', loadChildren: '../surveys/surveys.module#SurveysModule' },
      { path: 'myAchievements', component: UsersAchievementsComponent },
      { path: 'myAchievements/update', component: UsersAchievementsUpdateComponent },
      { path: 'news', component: NewsComponent }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
