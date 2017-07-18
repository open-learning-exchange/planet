import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule,ReactiveFormsModule } from "@angular/forms";
import { HttpModule } from "@angular/http";
import { AppModule } from '../app.module'
import { MembersComponent } from './members.component';

@NgModule({
  declarations: [
    MembersComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
  ],
  providers: [],
  bootstrap: [MembersComponent]
})
export class MembersModule { }