import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
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
import { PlanetCalendarComponent } from './calendar.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule, FullCalendarModule
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
    PlanetCalendarComponent
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
    PlanetCalendarComponent
  ]
})
export class SharedComponentsModule {}
