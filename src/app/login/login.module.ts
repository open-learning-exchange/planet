import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginComponent } from './login.component';

import { MatInputModule } from '@angular/material/input';
import { LoginRouterModule } from './login-router.module';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [
    LoginRouterModule, FormsModule, CommonModule, MatInputModule, MatButtonModule
  ],
  declarations: [
    LoginComponent
  ]
})
export class LoginModule { }
