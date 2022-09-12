import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
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
// import { LandingNavbarMobileComponent } from './landing-nav/landing-nav.mobile.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    PlanetCalendarModule,
    SharedComponentsModule
  ],
  declarations: [
    LandingComponent,
    LandingNavbarComponent,
    // LandingNavbarMobileComponent,
    LandingHeroComponent,
    LandingHomeComponent,
    LandingNewsComponent,
    NewsCardItemComponent,
    NewsItemDetailsComponent,
    LandingFooterComponent
  ],
  exports: [ LandingComponent ]
})
export class LandingModule {}
