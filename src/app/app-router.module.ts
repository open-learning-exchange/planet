import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AuthService } from './shared/auth-guard.service';
import { UnsavedChangesGuard } from './shared/guards/unsaved-changes.guard';
import { CoursesAddComponent } from './courses/add-courses/courses-add.component';
import { UsersUpdateComponent } from './users/users-update/users-update.component';


export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
    canActivateChild: [ AuthService ],
    canDeactivate: [ UnsavedChangesGuard ]
  },
  {
    path: 'courses/add',
    component: CoursesAddComponent,
    canDeactivate: [ UnsavedChangesGuard ]
  },
  {
    path: 'users/update/:username',
    component: UsersUpdateComponent,
    canDeactivate: [ UnsavedChangesGuard ],
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule),
    canActivate: [ AuthService ]
  },
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ],
  providers: [ UnsavedChangesGuard ]
})
export class AppRoutingModule {}
