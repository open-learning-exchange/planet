import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule } from '@angular/router';
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
import { LabelComponent } from './label.component';
import { TimePipe } from '../manager-dashboard/reports/time.pipe';
import { AvatarComponent } from './avatar.component';
import { LanguageLabelComponent } from './language-label.component';
import { RestrictDiacriticsDirective } from './restrict-diacritics.directives';
import { ChatOutputDirective } from './chat-output.directive';
import { TruncateTextPipe } from '../shared/truncate-text.pipe';
import { TimeAgoPipe } from '../shared/time-ago.pipe';
import { PlanetLoadingSpinnerComponent } from './planet-loading-spinner.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule, CovalentMarkdownModule, RouterModule
  ],
  exports: [
    PlanetLocalStatusComponent,
    PlanetLoadingSpinnerComponent,
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
    CommunityListComponent,
    LabelComponent,
    LanguageLabelComponent,
    TimePipe,
    AvatarComponent,
    RestrictDiacriticsDirective,
    ChatOutputDirective,
    OverlayModule,
    TruncateTextPipe,
    TimeAgoPipe
  ],
  declarations: [
    PlanetLoadingSpinnerComponent,
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
    CommunityListComponent,
    LabelComponent,
    LanguageLabelComponent,
    TimePipe,
    AvatarComponent,
    RestrictDiacriticsDirective,
    ChatOutputDirective,
    TruncateTextPipe,
    TimeAgoPipe
  ],
  providers: [
    TimePipe
  ]
})
export class SharedComponentsModule {}
