import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginComponent } from './login.component';
import { LoginRouterModule } from './login-router.module';
import { MaterialModule } from '../shared/material.module';

@NgModule({
  imports: [
    LoginRouterModule, FormsModule, CommonModule, MaterialModule
  ],
  declarations: [
    LoginComponent
  ]
})
export class LoginModule { }
