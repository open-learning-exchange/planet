import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CertificationComponent } from './certification.component';

const routes: Routes = [
  { path: '', component: CertificationComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CertificationRouterModule {}
