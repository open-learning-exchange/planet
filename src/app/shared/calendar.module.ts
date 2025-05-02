import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { PlanetCalendarComponent } from './calendar.component';
import { DialogsAddMeetupsModule } from './dialogs/dialogs-add-meetups.module';
import { PlanetDialogsModule } from './dialogs/planet-dialogs.module';

@NgModule({
  imports: [
    CommonModule,
    FullCalendarModule,
    DialogsAddMeetupsModule,
    PlanetDialogsModule
  ],
  exports: [
    PlanetCalendarComponent
  ],
  declarations: [
    PlanetCalendarComponent
  ]
})
export class PlanetCalendarModule {}
