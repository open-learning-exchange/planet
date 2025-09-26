import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CommunityComponent } from './community.component';
import { CommunityLinkDialogComponent } from './community-link-dialog.component';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { NewsModule } from '../news/news.module';
import { TeamsModule } from '../teams/teams.module';
import { PlanetCalendarModule } from '../shared/calendar.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    PlanetDialogsModule,
    SharedComponentsModule,
    NewsModule,
    TeamsModule,
    PlanetCalendarModule,
    RouterModule,
  ],
  declarations: [
    CommunityComponent,
    CommunityLinkDialogComponent,
  ],
  exports: [
    CommunityComponent,
    CommunityLinkDialogComponent,
  ]
})
export class CommunitySharedModule {}
