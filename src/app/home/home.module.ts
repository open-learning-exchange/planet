import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module';
import { CommunityComponent } from '../community/community.component';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { NationValidatorService } from '../validators/nation-validator.service';
import { NationComponent } from '../nation/nation.component';

@NgModule({
<<<<<<< HEAD
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule
  ],
=======
  imports: [ HomeRouterModule, CommonModule, FormsModule, ReactiveFormsModule ],
>>>>>>> Bracket spacing rule for linting (Fixes #150) (#153)
  declarations: [
    HomeComponent,
    DashboardComponent,
    NavigationComponent,
    UsersComponent,
    CommunityComponent,
    NationComponent
  ],
<<<<<<< HEAD
  providers: [ NationValidatorService ]
=======
  providers: [ CourseValidatorService, NationValidatorService ]
>>>>>>> Bracket spacing rule for linting (Fixes #150) (#153)
})
export class HomeModule {}
