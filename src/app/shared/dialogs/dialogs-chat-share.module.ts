import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '../material.module';
import { TeamsModule } from '../../teams/teams.module';
import { MeetupsModule } from '../../meetups/meetups.module';
import { PlanetFormsModule } from '../forms/planet-forms.module';

import { DialogsChatShareComponent } from './dialogs-chat-share.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    MeetupsModule,
    PlanetFormsModule,
    ReactiveFormsModule,
    TeamsModule
  ],
  exports: [
    DialogsChatShareComponent
  ],
  declarations: [
    DialogsChatShareComponent
  ]
})
export class DialogsChatShareModule {}
