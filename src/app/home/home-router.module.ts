import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { myDashboardRoute } from './router-constants';
import { CoursesProgressLearnerComponent } from '../courses/progress-courses/courses-progress-learner.component';
import { AuthService } from '../shared/auth-guard.service';

export function dashboardPath(route): string {
  return `${myDashboardRoute}/${route}`;
}

const alwaysGuardedRoutes = [
  { path: 'community', loadChildren: () => import('../community/community-viewer.module').then(m => m.CommunityViewerModule) },
  { path: 'users', loadChildren: () => import('../users/users.module').then(m => m.UsersModule) },
  {
    path: 'manager',
    loadChildren: () => import('../manager-dashboard/manager-dashboard.module').then(m => m.ManagerDashboardModule),
    data: { roles: [ '_admin' ] }
  },
  { path: 'courses', loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule) },
  { path: 'feedback', loadChildren: () => import('../feedback/feedback.module').then(m => m.FeedbackModule) },
  { path: 'resources', loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule) },
  { path: 'chat', loadChildren: () => import('../chat/chat.module').then(m => m.ChatModule) },
  { path: 'meetups', loadChildren: () => import('../meetups/meetups.module').then(m => m.MeetupsModule) },
  { path: 'notifications', loadChildren: () => import('../notifications/notifications.module').then(m => m.NotificationsModule) },
  { path: 'upgrade', loadChildren: () => import('../upgrade/upgrade.module').then(m => m.UpgradeModule) },
  { path: 'teams', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule) },
  { path: 'enterprises', loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule), data: { mode: 'enterprise' } },
  { path: 'health', loadChildren: () => import('../health/health-list.module').then(m => m.HealthListModule), data: { roles: [ '_admin', 'health' ] } },
  {
    path: 'health/profile/:id',
    loadChildren: () => import('../health/health.module').then(m => m.HealthModule), data: { roles: [ '_admin', 'health' ] } },
  { path: 'nation', loadChildren: () => import('../teams/teams-services.module').then(m => m.TeamsServicesModule), data: { mode: 'services' } },
  { path: 'earth', loadChildren: () => import('../teams/teams-services.module').then(m => m.TeamsServicesModule), data: { mode: 'services' } },
  { path: myDashboardRoute, loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardModule) },
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
  { path: dashboardPath('myAchievements'), loadChildren: () => import('../users/users-achievements/users-achievements.module').then(m => m.UsersAchievementsModule) },
  { path: dashboardPath('myAchievements/update'), loadChildren: () => import('../users/users-achievements/users-achievements.module').then(m => m.UsersAchievementsModule) },
  { path: dashboardPath('myHealth'), loadChildren: () => import('../health/health.module').then(m => m.HealthModule) },
  {
    path: dashboardPath('myCourses'),
    loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule), data: { myCourses: true }
  },
  { path: dashboardPath('myProgress'), component: CoursesProgressLearnerComponent },
  {
    path: dashboardPath('myLibrary'),
    loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { view: 'myLibrary' }
  },
  {
    path: dashboardPath('myPersonals'),
    loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { view: 'myPersonals' }
  }
];

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('../community/community-home.module').then(m => m.CommunityHomeModule)
  },
  {
    path: '',
    children: alwaysGuardedRoutes,
    canActivateChild: [ AuthService ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HomeRouterModule {}
