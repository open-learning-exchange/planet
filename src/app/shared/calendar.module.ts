import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { PlanetCalendarComponent } from './calendar.component';
import { DialogsAddMeetupsModule } from './dialogs/dialogs-add-meetups.module';


@NgModule({
  imports: [
    CommonModule,
    FullCalendarModule,
    DialogsAddMeetupsModule
  ],
  exports: [
    PlanetCalendarComponent
  ],
  declarations: [
    PlanetCalendarComponent
  ],
  entryComponents: [
    PlanetCalendarComponent
  ]
})
export class PlanetCalendarModule {}
