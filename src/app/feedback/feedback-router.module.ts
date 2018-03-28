import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FeedbackComponent } from './feedback.component';
import { FeedbackViewComponent } from './feedback-view.component';

const routes: Routes = [
  { path: '', component: FeedbackComponent },
  { path: 'view/:id', component: FeedbackViewComponent },
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class FeedbackRouterModule {}
