import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { environment } from './environments/environment';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-router.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MaterialModule } from './app/shared/material.module';
import { PlanetDialogsModule } from './app/shared/dialogs/planet-dialogs.module';
import { FullCalendarModule } from '@fullcalendar/angular';
import { ServiceWorkerModule } from '@angular/service-worker';
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
