import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ConfigurationComponent } from './configuration.component';

const routes: Routes = [
    { path: '', component: ConfigurationComponent },
    { path: 'update', component: ConfigurationComponent }
];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class ConfigurationRouterModule { }
