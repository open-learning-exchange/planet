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
import { PlanetMessageService } from './shared/planet-message.service';
import { MaterialModule } from './shared/material.module';
import { NgxImgModule } from 'ngx-img';
import { environment } from '../environments/environment';
import { MatIconRegistry } from '@angular/material';
import { FeedbackService } from './feedback/feedback.service';
import { ResourcesService } from './resources/resources.service';
import { SubmissionsService } from './submissions/submissions.service';
import { CoursesService } from './courses/courses.service';
import { SHARED_SERVICES } from './shared/database';
import { SyncService } from './shared/sync.service';
import { PlanetDialogsModule } from './shared/dialogs/planet-dialogs.module';
import { TeamsService } from './teams/teams.service';
import { RatingService } from './shared/forms/rating.service';
import { TagsService } from './shared/forms/tags.service';
import { ManagerService } from './manager-dashboard/manager.service';
import { FormsModule } from '@angular/forms';
import { TextMaskModule } from 'angular2-text-mask';

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    PlanetDialogsModule,
    FormsModule,
    TextMaskModule,
    NgxImgModule.forRoot(),
    environment.production
      ? ServiceWorkerModule.register('/ngsw-worker.js')
      : []
  ],
  declarations: [
    AppComponent, PageNotFoundComponent
  ],
  providers: [
    CouchService,
    AuthService,
    UserService,
    ValidatorService,
    PlanetMessageService,
    MatIconRegistry,
    FeedbackService,
    ResourcesService,
    SubmissionsService,
    CoursesService,
    ...SHARED_SERVICES,
    SyncService,
    TeamsService,
    RatingService,
    TagsService,
    ManagerService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
