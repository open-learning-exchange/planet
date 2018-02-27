import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './meetups-add.component';

import { MeetupsRouterModule } from './meetups-router.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';

@NgModule({
  imports: [
    MeetupsRouterModule, ReactiveFormsModule, PlanetFormsModule, CommonModule, FormsModule, PlanetDialogsModule, MaterialModule
  ],
  declarations: [
    MeetupsComponent, MeetupsAddComponent
  ]
})
export class MeetupsModule {}
