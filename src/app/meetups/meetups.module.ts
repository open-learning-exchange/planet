import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './add-meetups/meetups-add.component';
import { MeetupsViewComponent } from './view-meetups/meetups-view.component';

import { MeetupsRouterModule } from './meetups-router.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { MeetupService } from './meetups.service';
import { CovalentTextEditorModule } from '@covalent/text-editor';
import { MarkDownOptionsService } from '../shared/markdown-options.service';
import { MarkdownModule } from 'angular2-markdown';

@NgModule({
  imports: [
    MeetupsRouterModule, ReactiveFormsModule, PlanetFormsModule, CommonModule, FormsModule, PlanetDialogsModule, MaterialModule
    , CovalentTextEditorModule, MarkdownModule
  ],
  declarations: [
    MeetupsComponent, MeetupsAddComponent, MeetupsViewComponent
  ],
  providers: [ MeetupService, MarkDownOptionsService ]
})
export class MeetupsModule {}
