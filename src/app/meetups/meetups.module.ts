import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './meetups-add.component';

import { MeetupsRouterModule } from './meetups-router.module';
import { PlanetAlertsModule } from '../shared/alerts/planet-alerts.module';

@NgModule({
  imports: [
    MeetupsRouterModule, CommonModule, FormsModule, PlanetAlertsModule
  ],
  declarations: [
    MeetupsComponent, MeetupsAddComponent
  ]
})
export class MeetupsModule {}
