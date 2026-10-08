import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FullCalendarModule } from '@fullcalendar/angular';
import { ServiceWorkerModule } from '@angular/service-worker';

import { MaterialModule } from '@shared/material.module';
import { PlanetDialogsModule } from '@shared/dialogs/planet-dialogs.module';

import { environment } from './environments/environment';
import { AppRoutingModule } from './app/app-router.module';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(BrowserModule, AppRoutingModule, MaterialModule, PlanetDialogsModule, FullCalendarModule, environment.production
      ? ServiceWorkerModule.register('/ngsw-worker.js')
      : []),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations()
  ]
});
