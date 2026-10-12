import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { PlanetCalendarComponent } from './planet-calendar.component';
import { MeetupsAddDialogModule } from '../../meetups/meetups-add-dialog.module';


@NgModule({
  imports: [
    CommonModule,
    FullCalendarModule,
    MeetupsAddDialogModule,
    PlanetCalendarComponent
  ],
  exports: [
    PlanetCalendarComponent
  ]
})
export class PlanetCalendarModule {}
