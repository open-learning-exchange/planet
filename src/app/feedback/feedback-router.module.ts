import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FeedbackComponent } from './feedback.component';
import { ViewfeedbackComponent } from './viewfeedback.component';

const routes: Routes = [
  { path: '', component: FeedbackComponent },
  { path: 'viewfeedback', component: ViewfeedbackComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class FeedbackRouterModule {}
