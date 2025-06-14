import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppRoutingModule } from './app-router.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ImageCropperModule } from 'ngx-image-cropper';
import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { MaterialModule } from './shared/material.module';
import { environment } from '../environments/environment';
import { PlanetDialogsModule } from './shared/dialogs/planet-dialogs.module';

import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

FullCalendarModule.registerPlugins([
  dayGridPlugin,
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
    ImageCropperModule,
    environment.production
      ? ServiceWorkerModule.register('/ngsw-worker.js')
      : []
  ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
