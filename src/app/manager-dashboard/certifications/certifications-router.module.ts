import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CertificationsComponent } from './certifications.component';
import { CertificationsAddComponent } from './certifications-add.component';
import { CertificationsViewComponent } from './certifications-view.component';

import { ApproveCertificatesComponent } from './approve-certificates/approve-certificates.component';

const routes: Routes = [
  { path: '', component: CertificationsComponent },
  { path: 'add', component: CertificationsAddComponent },
  { path: 'update/:id', component: CertificationsAddComponent },
  { path: 'view/:id', component: CertificationsViewComponent },
  { path: 'approve', component: ApproveCertificatesComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CertificationsRouterModule {}
