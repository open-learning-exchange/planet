import { Component } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { StateService } from './shared/state.service';
import { IconRegistryService } from './shared/icon-registry.service';
declare let gtag: Function;

@Component({
  selector: 'planet-app',
  template: '<div i18n-dir dir="ltr"><router-outlet></router-outlet></div>'
})
export class AppComponent {
  constructor(
    public router: Router,
    private stateService: StateService,
    private iconRegistryService: IconRegistryService
  ) {
    this.iconRegistryService.registerIcons();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.stateService.requestData('configurations', 'local');
      }
      if (event instanceof NavigationEnd) {
        gtag('config', 'UA-118745384-1', { 'page_path': event.urlAfterRedirects });
      }
    });
  }
}
