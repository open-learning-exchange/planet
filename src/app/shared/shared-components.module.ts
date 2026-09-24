import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule } from '@angular/router';

import { PlanetLocalStatusComponent } from './ui/planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './dialogs/submit.directive';
import { LowercaseDirective } from './forms/lowercase.directive';
import { PlanetLanguageComponent } from './language/planet-language.component';
import { AuthorizedRolesDirective } from './auth/authorized-roles.directive';
import { PlanetBetaDirective } from './auth/planet-beta.directive';
import { PlanetFilteredAmountComponent } from './tables/planet-filtered-amount.component';
import { PlanetRoleComponent } from './auth/planet-role.component';
import { PlanetMarkdownComponent } from './markdown/planet-markdown.component';
import { LabelComponent } from './ui/label.component';
import { AvatarComponent } from './ui/avatar.component';
import { LanguageLabelComponent } from './language/language-label.component';
import { RestrictDiacriticsDirective } from './forms/restrict-diacritics.directive';
import { AiChatOutputDirective } from './ai/ai-chat-output.directive';
import { TruncateTextPipe } from './text/truncate-text.pipe';
import { FullNamePipe } from './text/full-name.pipe';
import { TimeAgoPipe } from './text/time-ago.pipe';
import { PlanetLoadingSpinnerComponent } from './ui/planet-loading-spinner.component';
import { PreviewOverflowDirective } from './ui/preview-overflow.directive';

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
    PlanetFilteredAmountComponent,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    LabelComponent,
    LanguageLabelComponent,
    AvatarComponent,
    RestrictDiacriticsDirective,
    AiChatOutputDirective,
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
    PlanetFilteredAmountComponent,
    PlanetRoleComponent,
    PlanetMarkdownComponent,
    LabelComponent,
    LanguageLabelComponent,
    AvatarComponent,
    RestrictDiacriticsDirective,
    AiChatOutputDirective,
    OverlayModule,
    TruncateTextPipe,
    FullNamePipe,
    TimeAgoPipe,
    PreviewOverflowDirective
  ]
})
export class SharedComponentsModule {}
