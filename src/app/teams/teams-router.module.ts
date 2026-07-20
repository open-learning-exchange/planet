import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';

export const teamsRoutes: Routes = [
  { path: '', component: TeamsComponent },
  { path: 'view/:teamId', component: TeamsViewComponent },
  {
    path: 'view/:teamId/surveys',
    loadChildren: () => import('../surveys/surveys.module').then(m => m.SurveysModule)
  },
  // Courses & resources opened from a team keep the team in the URL, so back
  // navigation, refreshes, and shared links all preserve the team context
  {
    path: 'view/:teamId/courses/:id',
    loadComponent: () => import('../courses/view-courses/courses-view.component').then(c => c.CoursesViewComponent),
    data: { fallbackTab: 'courses' }
  },
  {
    path: 'view/:teamId/courses/:id/update',
    loadComponent: () => import('../courses/add-courses/courses-add.component').then(c => c.CoursesAddComponent)
  },
  {
    path: 'view/:teamId/courses/:id/step/:stepNum',
    loadComponent: () => import('../courses/step-view-courses/courses-step-view.component').then(c => c.CoursesStepViewComponent)
  },
  {
    path: 'view/:teamId/courses/:id/step/:stepNum/exam',
    loadComponent: () => import('../exams/exams-view.component').then(c => c.ExamsViewComponent)
  },
  {
    path: 'view/:teamId/resources/:id',
    loadComponent: () => import('../resources/view-resources/resources-view.component').then(c => c.ResourcesViewComponent),
    data: { fallbackTab: 'resources' }
  },
  { path: 'users', loadChildren: () => import('../users/users.module').then(m => m.UsersModule) },
];
@NgModule({
  imports: [ RouterModule.forChild(teamsRoutes) ],
  exports: [ RouterModule ]
})
export class TeamsRouterModule {}
