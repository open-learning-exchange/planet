import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AppRoutingModule } from './app-router.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './shared/material.module';
import { NgxImgModule } from 'ngx-img';
import { environment } from '../environments/environment';
import { PlanetDialogsModule } from './shared/dialogs/planet-dialogs.module';
import { UnsavedChangesGuard } from './shared/guards/unsaved-changes.guard';

import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

FullCalendarModule.registerPlugins([ // register FullCalendar plugins
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin
]);

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    PlanetDialogsModule,
    FullCalendarModule,
    NgxImgModule.forRoot(),
    environment.production
      ? ServiceWorkerModule.register('/ngsw-worker.js')
      : []
  ],
  providers: [ UnsavedChangesGuard ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
