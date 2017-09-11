import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from "ng2-Translate";

import { LoginComponent } from './login.component';


import { LoginRouterModule } from './login-router.module'

@NgModule({
  imports: [
    LoginRouterModule,FormsModule,CommonModule,
    TranslateModule.forRoot()
  ],
  declarations: [
    LoginComponent
  ]
})
export class LoginModule { }