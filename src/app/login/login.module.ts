import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginComponent } from './login.component';


import { LoginRouterModule } from './login-router.module'

@NgModule({
  imports: [
    LoginRouterModule,FormsModule,CommonModule
  ],
  declarations: [
    LoginComponent
  ]
})
export class LoginModule { }