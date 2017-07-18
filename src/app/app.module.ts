import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { HttpModule } from "@angular/http";

import { RouterModule,Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { NavComponent } from './nav/nav.component';
import { FooterComponent } from './footer/footer.component';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

// const appRoutes: Routes = [
  // { path: '',   component: LoginComponent, pathMatch: 'full' }
// ];

@NgModule({
  declarations: [
    AppComponent,
    // RouterModule,
    LoginComponent,
    NavComponent,
    FooterComponent,
    PageNotFoundComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot([
        {
            path: '',
            component: LoginComponent
        },
        {
            path: 'login',
            component: LoginComponent
        },
        {
            path: '**',
            component: PageNotFoundComponent
        }
    ])
  ],
  providers: [CouchService, AuthService, UserService],
  bootstrap: [AppComponent]
})
export class AppModule { }
