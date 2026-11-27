import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from './chat.component';
import { ChatSharedComponent } from './chat-shared.component';

const routes: Routes = [
  { path: '', component: ChatComponent, children: [ { path: 'shared/:shareId', component: ChatSharedComponent } ] }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ChatRouterModule {}
