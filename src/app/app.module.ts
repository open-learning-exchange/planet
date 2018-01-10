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
import { PlanetFormsModule } from './shared/planet-forms.module';

@NgModule({
  imports: [
<<<<<<< 938979cecf00e8387d1cfa9f3b0d2a53c616f195
    BrowserModule, AppRoutingModule, HttpClientModule, BrowserAnimationsModule, FormsModule, PlanetFormsModule, ReactiveFormsModule, MaterialModule
=======
    BrowserModule, AppRoutingModule, HttpClientModule, BrowserAnimationsModule
>>>>>>> [#274] Added separate module
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
