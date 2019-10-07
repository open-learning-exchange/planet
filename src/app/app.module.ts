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

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    PlanetDialogsModule,
    NgxImgModule.forRoot(),
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
