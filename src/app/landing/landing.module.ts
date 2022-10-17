import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { MatDialogModule } from '@angular/material/dialog';
import { PlanetCalendarModule } from '../shared/calendar.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

import { LandingComponent } from './landing.component';
import { LandingNavbarComponent } from './landing-nav/landing-nav.component';
import { LandingHeroComponent } from './landing-hero/landing-hero.component';
import { LandingHomeComponent } from './landing-home/landing-home.component';
import { LandingFooterComponent } from './landing-footer/landing-footer.component';
import { LandingNewsComponent } from './landing-home/landing-news/landing-news.component';
import { NewsCardItemComponent } from './landing-home/landing-news/newscard-item/newscard-item.component';
import { NewsItemDetailsComponent } from './landing-home/landing-news/newsitem-detail/newsitem-detail.component';
import { LandingEventComponent } from './landing-home/landing-event/landing-event.component';
import { LandingEventCardComponent } from './landing-home/landing-event/landing-eventcard/landing-eventcard.component';
import { LandingEventDetailComponent } from './landing-home/landing-event/landing-eventdetail/landing-eventdetail.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    MatDialogModule,
    PlanetCalendarModule,
    SharedComponentsModule
  ],
  declarations: [
    LandingComponent,
    LandingNavbarComponent,
    LandingHeroComponent,
    LandingHomeComponent,
    LandingNewsComponent,
    NewsCardItemComponent,
    NewsItemDetailsComponent,
    LandingEventComponent,
    LandingEventCardComponent,
    LandingEventDetailComponent,
    LandingFooterComponent
  ],
  exports: [ LandingComponent ]
})
export class LandingModule {}
