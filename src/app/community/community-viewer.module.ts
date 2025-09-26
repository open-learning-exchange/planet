import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CommunityViewerRoutingModule } from './community-viewer-routing.module';
import { CommunitySharedModule } from './community-shared.module';

@NgModule({
  imports: [
    CommunityViewerRoutingModule,
    RouterModule,
    CommunitySharedModule,
  ],
})
export class CommunityViewerModule {}
