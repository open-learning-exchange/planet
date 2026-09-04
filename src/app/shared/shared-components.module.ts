import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule } from '@angular/router';

import { PlanetLocalStatusComponent } from '@shared/platform/planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from '@shared/dialogs/submit.directive';
import { LowercaseDirective } from '@shared/text/lowercase.directive';
import { PlanetLanguageComponent } from '@shared/language/planet-language.component';
import { ResourcesMenuComponent } from '../resources/view-resources/resources-menu.component';
import { AuthorizedRolesDirective } from '@shared/auth/authorized-roles.directive';
import { PlanetBetaDirective } from '@shared/auth/beta.directive';
import { FilteredAmountComponent } from '@shared/tables/planet-filtered-amount.component';
import { TasksComponent, AssigneeNamePipe } from '../tasks/tasks.component';
import { PlanetRoleComponent } from '@shared/auth/planet-role.component';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { CommunityListComponent } from '../community/community-list.component';
import { LabelComponent } from '@shared/ui/label.component';
import { TimePipe } from '../manager-dashboard/reports/time.pipe';
import { AvatarComponent } from '@shared/ui/avatar.component';
import { LanguageLabelComponent } from '@shared/language/language-label.component';
import { RestrictDiacriticsDirective } from '@shared/language/restrict-diacritics.directives';
import { ChatOutputDirective } from '@shared/ai/chat-output.directive';
import { TruncateTextPipe } from '@shared/text/truncate-text.pipe';
import { FullNamePipe } from '@shared/text/full-name.pipe';
import { TimeAgoPipe } from '@shared/text/time-ago.pipe';
import { PlanetLoadingSpinnerComponent } from '@shared/ui/planet-loading-spinner.component';
import { PreviewOverflowDirective } from '@shared/ui/preview-overflow.directive';

@NgModule({
  imports: [
    CommonModule, MaterialModule, RouterModule,
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
    FullNamePipe,
    TimeAgoPipe,
    PreviewOverflowDirective
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
    FullNamePipe,
    TimeAgoPipe,
    PreviewOverflowDirective
  ],
  providers: [
    TimePipe
  ]
})
export class SharedComponentsModule {}
