import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CovalentMarkdownModule } from '@covalent/markdown';
import { PlanetLocalStatusComponent } from './planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';
import { LowercaseDirective } from '../shared/lowercase.directive';
import { PlanetLanguageComponent } from './planet-language.component';
import { ResourcesMenuComponent } from '../resources/view-resources/resources-menu.component';
import { AuthorizedRolesDirective } from './authorized-roles.directive';
import { PlanetBetaDirective } from './beta.directive';
import { FilteredAmountComponent } from './planet-filtered-amount.component';
import { TasksComponent, FilterAssigneePipe, AssigneeNamePipe } from '../tasks/tasks.component';
import { PlanetRoleComponent } from './planet-role.component';
import { PlanetMarkdownComponent } from './planet-markdown.component';
import { CommunityListComponent } from '../community/community-list.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule, MaterialModule, CovalentMarkdownModule, RouterModule
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
    AssigneeNamePipe,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    CommunityListComponent
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
    AssigneeNamePipe,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    CommunityListComponent
  ]
})
export class SharedComponentsModule {}
