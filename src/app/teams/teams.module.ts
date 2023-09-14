import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { CovalentMarkdownModule } from '@covalent/markdown';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { NewsModule } from '../news/news.module';
import { DialogsAddResourcesModule } from '../shared/dialogs/dialogs-add-resources.module';
import { DialogsAddTableModule } from '../shared/dialogs/dialogs-add-table.module';
import { DialogsResourcesViewerModule } from '../shared/dialogs/dialogs-resources-viewer.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { TeamsViewFinancesComponent } from './teams-view-finances.component';
import { PlanetCalendarModule } from '../shared/calendar.module';
import { FormsModule } from '@angular/forms';
import { TeamsMemberComponent } from './teams-member.component';
import { TeamsReportsComponent } from './teams-reports.component';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { TeamsReportsDetailComponent } from './teams-reports-detail.component';

@NgModule({
  exports: [ TeamsViewComponent, TeamsComponent, TeamsViewFinancesComponent, TeamsMemberComponent, TeamsReportsComponent ],
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule,
    NewsModule,
    DialogsAddResourcesModule,
    DialogsAddTableModule,
    DialogsResourcesViewerModule,
    CovalentMarkdownModule,
    SharedComponentsModule,
    PlanetCalendarModule,
    FormsModule,
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent,
    TeamsViewFinancesComponent,
    TeamsReportsComponent,
    TeamsReportsDetailComponent,
    TeamsMemberComponent,
    TeamsReportsDialogComponent
  ]
})
export class TeamsModule {}
