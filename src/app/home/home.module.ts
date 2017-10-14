import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module';
import { CoursesComponent } from '../courses/courses.component';

import { CourseValidatorService } from '../validators/course-validator.service';

@NgModule({
  imports: [SharedModule, HomeRouterModule],
  declarations: [
    HomeComponent,
    DashboardComponent,
    NavigationComponent,
    UsersComponent,
    CoursesComponent
  ],
  providers: [CourseValidatorService]
})
export class HomeModule {}
