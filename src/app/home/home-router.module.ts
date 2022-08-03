import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeComponent } from './home.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { UpgradeComponent } from '../upgrade/upgrade.component';
import { UsersAchievementsComponent } from '../users/users-achievements/users-achievements.component';
import { UsersAchievementsUpdateComponent } from '../users/users-achievements/users-achievements-update.component';
import { LogsMyPlanetComponent } from '../logs-myplanet/logs-myplanet.component';
import { TeamsViewComponent } from '../teams/teams-view.component';
import { HealthListComponent } from '../health/health-list.component';
import { CommunityComponent } from '../community/community.component';
import { myDashboardRoute } from './router-constants';
import { CoursesProgressLearnerComponent } from '../courses/progress-courses/courses-progress-learner.component';
import { LandingComponent } from '../landing/landing.component';

export function dashboardPath(route): string {
  return `${myDashboardRoute}/${route}`;
}

const routes: Routes = [
  { path: '', component: HomeComponent,
    children: [
      { path: '', component: CommunityComponent },
      { path: 'community/:code', component: CommunityComponent },
      { path: 'users', loadChildren: () => import('../users/users.module').then(m => m.UsersModule) },
      { path: 'manager', loadChildren: () => import('../manager-dashboard/manager-dashboard.module').then(m => m.ManagerDashboardModule) },
      { path: 'courses', loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule) },
      { path: 'feedback', loadChildren: () => import('../feedback/feedback.module').then(m => m.FeedbackModule) },
      { path: 'resources', loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule) },
      { path: 'meetups', loadChildren: () => import('../meetups/meetups.module').then(m => m.MeetupsModule) },
      // { path: 'notifications', component: NotificationsComponent },
      { path: 'landing', component: LandingComponent },
      { path: 'landing', loadChildren: () => import('../landing/landing.module').then(m => m.LandingModule) },
      { path: 'upgrade', component: UpgradeComponent },
      { path: 'upgrade/myplanet', component: UpgradeComponent, data: { myPlanet: true } },
      { path: 'teams', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule) },
      { path: 'enterprises', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule), data: { mode: 'enterprise' } },
      { path: 'logs/myplanet', component: LogsMyPlanetComponent },
      { path: 'health', component: HealthListComponent },
      { path: 'health/profile/:id', loadChildren: () => import('../health/health.module').then(m => m.HealthModule) },
      { path: 'nation', component: TeamsViewComponent, data: { mode: 'services' } },
      { path: 'earth', component: TeamsViewComponent, data: { mode: 'services' } },
      { path: myDashboardRoute, component: DashboardComponent },
      {
        path: dashboardPath('mySurveys'),
        loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule), data: { mySurveys: true }
      },
      {
        path: dashboardPath('submissions'),
        loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule)
      },
      {
        path: dashboardPath('submissions/:type'),
        loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule)
      },
      {
        path: dashboardPath('myTeams'),
        loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule), data: { myTeams: true }
      },
      { path: dashboardPath('myAchievements'), component: UsersAchievementsComponent },
      { path: dashboardPath('myAchievements/update'), component: UsersAchievementsUpdateComponent },
      { path: dashboardPath('myHealth'), loadChildren: () => import('../health/health.module').then(m => m.HealthModule) },

      { path: dashboardPath('myProgress'), component: CoursesProgressLearnerComponent },
      {
        path: dashboardPath('myLibrary'),
        loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { view: 'myLibrary' }
      },
      {
        path: dashboardPath('myPersonals'),
        loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { view: 'myPersonals' }
      }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
