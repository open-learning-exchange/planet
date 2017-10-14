import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './resources-view.component';
import { ResourcesRouterModule } from './resources-router.module';
import { ListItemComponent } from './list-item/list-item.component';

@NgModule({
  imports: [SharedModule, ResourcesRouterModule],
  declarations: [ResourcesComponent, ResourcesViewComponent, ListItemComponent]
})
export class ResourcesModule {}
