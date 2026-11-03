import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule } from '@angular/router';

import { PlanetLocalStatusComponent } from '@shared/database/planet-local-status.component';
import { SubmitDirective } from '@shared/dialogs/submit.directive';
import { LowercaseDirective } from '@shared/forms/lowercase.directive';
import { PlanetLanguageComponent } from '@shared/language/planet-language.component';
import { AuthorizedRolesDirective } from '@shared/auth/authorized-roles.directive';
import { PlanetBetaDirective } from '@shared/auth/planet-beta.directive';
import { PlanetFilteredAmountComponent } from '@shared/tables/planet-filtered-amount.component';
import { PlanetRoleComponent } from '@shared/auth/planet-role.component';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { LabelComponent } from '@shared/ui/label.component';
import { AvatarComponent } from '@shared/ui/avatar.component';
import { LanguageLabelComponent } from '@shared/language/language-label.component';
import { RestrictDiacriticsDirective } from '@shared/forms/restrict-diacritics.directive';
import { TruncateTextPipe } from '@shared/text/truncate-text.pipe';
import { FullNamePipe } from '@shared/text/full-name.pipe';
import { TimeAgoPipe } from '@shared/text/time-ago.pipe';
import { PlanetLoadingSpinnerComponent } from '@shared/ui/planet-loading-spinner.component';

import { MaterialModule } from './material.module';

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
    TruncateTextPipe,
    FullNamePipe,
    TimeAgoPipe
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
    OverlayModule,
    TruncateTextPipe,
    FullNamePipe,
    TimeAgoPipe
  ]
})
export class SharedComponentsModule {}
