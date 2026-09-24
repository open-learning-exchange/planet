import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { NewsModule } from '../news/news.module';
import { ResourcesPickerDialogModule } from '../resources/resources-picker-dialog.module';
import { ResourcesViewerDialogModule } from '../resources/view-resources/resources-viewer-dialog.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { TeamsViewFinancesComponent } from './teams-view-finances.component';
import { PlanetCalendarModule } from '../shared/calendar/planet-calendar.module';
import { FormsModule } from '@angular/forms';
import { TeamsMemberComponent } from './teams-member.component';
import { TeamsReportsComponent } from './teams-reports.component';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { TeamsReportsDetailComponent } from './teams-reports-detail.component';
import { SurveysModule } from '../surveys/surveys.module';

@NgModule({
  exports: [TeamsViewComponent, TeamsComponent, TeamsViewFinancesComponent, TeamsMemberComponent, TeamsReportsComponent],
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule,
    NewsModule,
    ResourcesPickerDialogModule,
    ResourcesViewerDialogModule,
    SharedComponentsModule,
    PlanetCalendarModule,
    FormsModule,
    SurveysModule,
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
