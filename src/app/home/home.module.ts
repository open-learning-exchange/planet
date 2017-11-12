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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule
  ],
<<<<<<< HEAD
<<<<<<< HEAD
=======
  imports: [ HomeRouterModule, CommonModule, FormsModule, ReactiveFormsModule ],
>>>>>>> Bracket spacing rule for linting (Fixes #150) (#153)
=======
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
  declarations: [
    HomeComponent,
    DashboardComponent,
    NavigationComponent,
    UsersComponent,
    CommunityComponent,
    NationComponent
  ],
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  providers: [ NationValidatorService ]
=======
  providers: [ CourseValidatorService, NationValidatorService ]
>>>>>>> Bracket spacing rule for linting (Fixes #150) (#153)
=======
  providers: [ NationValidatorService ]
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
  providers: [ NationValidatorService ]
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
})
export class HomeModule {}
