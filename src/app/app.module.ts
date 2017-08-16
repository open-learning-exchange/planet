import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule,ReactiveFormsModule } from "@angular/forms";
import { HttpModule } from "@angular/http";
import { HostBinding } from '@angular/core';
import { RouterModule,Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { NavComponent } from './nav/nav.component';
import { FooterComponent } from './footer/footer.component';

import { CouchService } from './shared/couchdb.service';
import { AuthService } from './shared/auth-guard.service';
import { UserService } from './shared/user.service';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './register/register.component';
import { MembersComponent } from './members/members.component';
import { TestComponent } from './test/test.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { MeetupsComponent } from './meetups/meetups.component';
import { MeetupsaddComponent } from './meetupsadd/meetupsadd.component';
import { LibraryComponent } from './library/library.component'

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
    PageNotFoundComponent,
    DashboardComponent,
    RegisterComponent,
    MembersComponent,
    TestComponent,
    MeetupsComponent,
    MeetupsaddComponent,
    LibraryComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ReactiveFormsModule,
    NgxPaginationModule,
    RouterModule.forRoot([
        {
            path: '',
            component: LoginComponent
        },
        {
            path: 'resources',
            canActivate: [AuthService],
            component: LibraryComponent,
            children: [
              {
                path: 'add',
                component: LibraryComponent
              }
            ]
        },
        {
            path: 'login',
            component: LoginComponent
        },
        {
            path: 'dashboard',
            canActivate: [AuthService],
            component: DashboardComponent,
            children: [
              { 
                path: 'test',
                component: TestComponent
              }
            ]
        },
        {
            path: 'register',
            component: RegisterComponent
        },
        {
            path: 'members',
            canActivate: [AuthService],
            component: MembersComponent
        },
        {
            path: 'meetups',
            canActivate: [AuthService],
            component: MeetupsComponent
        },
         {
            path: 'meetupsadd',
            canActivate: [AuthService],
            component: MeetupsaddComponent
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
