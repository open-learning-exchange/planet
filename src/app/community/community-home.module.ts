import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CommunityHomeRoutingModule } from './community-home-routing.module';
import { CommunitySharedModule } from './community-shared.module';

@NgModule({
  imports: [
    CommunityHomeRoutingModule,
    RouterModule,
    CommunitySharedModule,
  ],
})
export class CommunityHomeModule {}
