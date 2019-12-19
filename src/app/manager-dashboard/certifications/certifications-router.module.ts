import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CertificationsComponent } from './certifications.component';
import { CertificationsAddComponent } from './certifications-add.component';

const routes: Routes = [
  { path: '', component: CertificationsComponent },
  { path: 'add', component: CertificationsAddComponent },
  { path: 'update/:id', component: CertificationsAddComponent }

];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CertificationsRouterModule {}
