import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeComponent } from './home.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { UpgradeComponent } from '../upgrade/upgrade.component';
import { UsersAchievementsComponent } from '../users/users-achievements/users-achievements.component';
import { UsersAchievementsUpdateComponent } from '../users/users-achievements/users-achievements-update.component';
import { NewsComponent } from '../news/news.component';
import { LogsMyPlanetComponent } from '../logs-myplanet/logs-myplanet.component';
import { TeamsViewComponent } from '../teams/teams-view.component';
import { HealthListComponent } from '../health/health-list.component';
import { CommunityComponent } from '../community/community.component';

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: CommunityComponent },
      { path: 'community/:code', component: CommunityComponent },
      { path: 'myDashboard', component: DashboardComponent },
      { path: 'users', loadChildren: () => import('../users/users.module').then(m => m.UsersModule) },
      { path: 'manager', loadChildren: () => import('../manager-dashboard/manager-dashboard.module').then(m => m.ManagerDashboardModule) },
      { path: 'courses', loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule) },
      { path: 'myCourses', loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule), data: { myCourses: true } },
      { path: 'feedback', loadChildren: () => import('../feedback/feedback.module').then(m => m.FeedbackModule) },
      { path: 'resources', loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule) },
      {
        path: 'myLibrary',
        loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { view: 'myLibrary' }
      },
      {
        path: 'myPersonals',
        loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { view: 'myPersonals' }
      },
      { path: 'meetups', loadChildren: () => import('../meetups/meetups.module').then(m => m.MeetupsModule) },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'submissions', loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule) },
      { path: 'submissions/:type', loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule) },
      {
        path: 'mySurveys',
        loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule), data: { mySurveys: true }
      },
      { path: 'upgrade', component: UpgradeComponent },
      { path: 'upgrade/myplanet', component: UpgradeComponent, data: { myPlanet: true } },
      { path: 'teams', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule) },
      { path: 'myTeams', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule), data: { myTeams: true } },
      { path: 'enterprises', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule), data: { mode: 'enterprise' } },
      { path: 'surveys', loadChildren: () => import('../surveys/surveys.module').then(m => m.SurveysModule) },
      { path: 'myAchievements', component: UsersAchievementsComponent },
      { path: 'myAchievements/update', component: UsersAchievementsUpdateComponent },
      { path: 'news', component: NewsComponent },
      { path: 'logs/myplanet', component: LogsMyPlanetComponent },
      { path: 'myHealth', loadChildren: () => import('../health/health.module').then(m => m.HealthModule) },
      { path: 'health', component: HealthListComponent },
      { path: 'health/profile/:id', loadChildren: () => import('../health/health.module').then(m => m.HealthModule) },
      { path: 'nation', component: TeamsViewComponent, data: { mode: 'services' } },
      { path: 'earth', component: TeamsViewComponent, data: { mode: 'services' } }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
