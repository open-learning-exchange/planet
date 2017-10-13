import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './resources-view.component';
import { ResourcesRouterModule } from './resources-router.module';

@NgModule({
  imports: [SharedModule, ResourcesRouterModule],
  declarations: [ResourcesComponent, ResourcesViewComponent]
})
export class ResourcesModule {}
