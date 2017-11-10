import './shared/rxjs-imports';

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

import { AppRoutingModule } from './app-router.module';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';

@NgModule({
  imports: [
    BrowserModule, AppRoutingModule, HttpModule
  ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  providers: [
    CouchService, AuthService, UserService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
