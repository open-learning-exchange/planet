import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

import { AppRoutingModule } from './app-router.module';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';
import { ValidatorService } from './validators/validator.service';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCheckboxModule , MatButtonModule, MatInputModule, MatCardModule } from '@angular/material';

@NgModule({
  imports: [
    BrowserModule, AppRoutingModule, HttpClientModule, BrowserAnimationsModule, MatCheckboxModule, MatInputModule, MatCardModule
  ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  providers: [
    CouchService, AuthService, UserService, ValidatorService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
