import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule } from '@angular/router';
import { CovalentFlavoredMarkdownModule } from '@covalent/flavored-markdown';

import { PlanetLocalStatusComponent } from './planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';
import { LowercaseDirective } from '../shared/lowercase.directive';
import { PlanetLanguageComponent } from './planet-language.component';
import { ResourcesMenuComponent } from '../resources/view-resources/resources-menu.component';
import { AuthorizedRolesDirective } from './authorized-roles.directive';
import { PlanetBetaDirective } from './beta.directive';
import { FilteredAmountComponent } from './planet-filtered-amount.component';
import { PlanetRoleComponent } from './planet-role.component';
import { LabelComponent } from './label.component';
import { TimePipe } from '../manager-dashboard/reports/time.pipe';
import { AvatarComponent } from './avatar.component';
import { LanguageLabelComponent } from './language-label.component';
import { RestrictDiacriticsDirective } from './restrict-diacritics.directives';
import { TruncateTextPipe } from '../shared/truncate-text.pipe';
import { TimeAgoPipe } from '../shared/time-ago.pipe';
import { PlanetLoadingSpinnerComponent } from './planet-loading-spinner.component';
import { PreviewOverflowDirective } from './preview-overflow.directive';

@NgModule({
  imports: [
    CommonModule, MaterialModule, CovalentFlavoredMarkdownModule, RouterModule,
    PlanetLoadingSpinnerComponent,
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent,
    LowercaseDirective,
    AuthorizedRolesDirective,
    PlanetBetaDirective,
    FilteredAmountComponent,
    PlanetRoleComponent,
    LabelComponent,
    LanguageLabelComponent,
    TimePipe,
    AvatarComponent,
    RestrictDiacriticsDirective,
    TruncateTextPipe,
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
    PlanetRoleComponent,
    LabelComponent,
    LanguageLabelComponent,
    TimePipe,
    AvatarComponent,
    RestrictDiacriticsDirective,
    OverlayModule,
    TruncateTextPipe,
    CovalentFlavoredMarkdownModule,
    TimeAgoPipe,
    PreviewOverflowDirective
  ],
  providers: [
    TimePipe
  ]
})
export class SharedComponentsModule {}
