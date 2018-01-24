import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

import { AppRoutingModule } from './app-router.module';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';
import { ValidatorService } from './validators/validator.service';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { environment } from '../environments/environment';

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    environment.production
      ? ServiceWorkerModule.register('/ngsw-worker.js')
      : []
  ],
  declarations: [AppComponent, PageNotFoundComponent],
  providers: [CouchService, AuthService, UserService, ValidatorService],
  bootstrap: [AppComponent]
})
export class AppModule {}
