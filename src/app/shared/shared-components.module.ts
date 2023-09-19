import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CovalentMarkdownModule } from '@covalent/markdown';
import { PlanetLocalStatusComponent } from './planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';
import { ClickOutsideDirective } from './clickoutside.directive';
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
import { LabelComponent } from './label.component';
import { MyPlanetTableComponent } from '../manager-dashboard/reports/myplanet-table.component';
import { TimePipe } from '../manager-dashboard/reports/time.pipe';
import { AvatarComponent } from './avatar.component';
import { LanguageLabelComponent } from './language-label.component';
import { ChatOutputDirective } from './chat-output.directive';

@NgModule({
  imports: [
    CommonModule, MaterialModule, CovalentMarkdownModule, RouterModule
  ],
  exports: [
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent,
    ClickOutsideDirective,
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    TasksComponent,
    FilterAssigneePipe,
    AssigneeNamePipe,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    CommunityListComponent,
    LabelComponent,
    LanguageLabelComponent,
    MyPlanetTableComponent,
    AvatarComponent,
    ChatOutputDirective
  ],
  declarations: [
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent,
    ClickOutsideDirective,
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    TasksComponent,
    FilterAssigneePipe,
    AssigneeNamePipe,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    CommunityListComponent,
    LabelComponent,
    LanguageLabelComponent,
    MyPlanetTableComponent,
    TimePipe,
    AvatarComponent,
    ChatOutputDirective
  ]
})
export class SharedComponentsModule {}
