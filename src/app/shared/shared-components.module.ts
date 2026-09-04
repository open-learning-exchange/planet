import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule } from '@angular/router';

import { PlanetLocalStatusComponent } from '@shared/platform/planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from '@shared/dialogs/submit.directive';
import { LowercaseDirective } from '@shared/text/lowercase.directive';
import { PlanetLanguageComponent } from '@shared/language/planet-language.component';
import { AuthorizedRolesDirective } from '@shared/auth/authorized-roles.directive';
import { PlanetBetaDirective } from '@shared/auth/beta.directive';
import { FilteredAmountComponent } from '@shared/tables/planet-filtered-amount.component';
import { PlanetRoleComponent } from '@shared/auth/planet-role.component';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { LabelComponent } from '@shared/ui/label.component';
import { AvatarComponent } from '@shared/ui/avatar.component';
import { LanguageLabelComponent } from '@shared/language/language-label.component';
import { RestrictDiacriticsDirective } from '@shared/language/restrict-diacritics.directive';
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
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    LabelComponent,
    LanguageLabelComponent,
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
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    LabelComponent,
    LanguageLabelComponent,
    AvatarComponent,
    RestrictDiacriticsDirective,
    ChatOutputDirective,
    OverlayModule,
    TruncateTextPipe,
    FullNamePipe,
    TimeAgoPipe,
    PreviewOverflowDirective
  ]
})
export class SharedComponentsModule {}
