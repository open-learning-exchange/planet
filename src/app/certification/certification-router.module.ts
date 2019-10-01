import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CertificationComponent } from './certification.component';
import { AddCertificationComponent } from './add-certification/add-certification.component';

const routes: Routes = [
  { path: '', component: CertificationComponent },
  { path: 'add', component: AddCertificationComponent },
  { path: 'update/:id', component: AddCertificationComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CertificationRouterModule {}
