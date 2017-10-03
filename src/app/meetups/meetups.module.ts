import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MeetupsComponent } from './meetups.component';
import { MeetupsaddComponent } from './meetupsadd.component';

import { MeetupsRouterModule } from './meetups-router.module';

@NgModule({
  imports: [
    MeetupsRouterModule, CommonModule, FormsModule
  ],
  declarations: [
    MeetupsComponent, MeetupsaddComponent
  ]
})
export class MeetupsModule {}
