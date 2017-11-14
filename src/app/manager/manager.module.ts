import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ManagerComponent } from './manager.component';
import { CommunityComponent } from '../community/community.component';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { NationValidatorService } from '../validators/nation-validator.service';
import { NationComponent } from '../nation/nation.component';
import { ManagerRouterModule } from './manager-router.module';
import { ManagerNavigationComponent } from './manager-navigation.component';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    ManagerRouterModule
  ],
  declarations: [
    CommunityComponent,
    NationComponent,
    ManagerComponent,
    ManagerNavigationComponent,
    ManagerDashboardComponent
  ],
  providers: [ NationValidatorService ]
})
export class ManagerModule {}
