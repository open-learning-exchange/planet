import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetLocalStatusComponent } from './planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';
import { LowercaseDirective } from '../shared/lowercase.directive';
import { PlanetLanguageComponent } from './planet-language.component';
import { ResourcesMenuComponent } from '../resources/view-resources/resources-menu.component';
import { AuthorizedRolesDirective } from './authorized-roles.directive';
import { PlanetBetaDirective } from './beta.directive';
import { FilteredAmountComponent } from './planet-filtered-amount.component';
import { TasksComponent, FilterAssigneePipe } from '../tasks/tasks.component';
import { PlanetRoleComponent } from './planet-role.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent,
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    TasksComponent,
    FilterAssigneePipe,
    PlanetRoleComponent
  ],
  declarations: [
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent,
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    TasksComponent,
    FilterAssigneePipe,
    PlanetRoleComponent
  ]
})
export class SharedComponentsModule {}
