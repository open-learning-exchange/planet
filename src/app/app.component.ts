import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { StateService } from './shared/state.service';
declare let gtag: Function;

@Component({
  selector: 'planet-app',
  template: '<div i18n-dir dir="ltr"><router-outlet></router-outlet></div>'
})
export class AppComponent {
  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    public router: Router,
    private stateService: StateService
  ) {
    iconRegistry.addSvgIcon(
      'myLibrary',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/library.svg'));
    iconRegistry.addSvgIcon(
      'myCourses',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/courses.svg'));
    iconRegistry.addSvgIcon(
      'myMeetups',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/meetups.svg'));
    iconRegistry.addSvgIcon(
      'myTeams',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/team.svg'));
    iconRegistry.addSvgIcon(
      'surveys',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/survey.svg'));
    iconRegistry.addSvgIcon(
      'feedback',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/feedback.svg'));
    iconRegistry.addSvgIcon(
      'logout',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logout.svg'));
    iconRegistry.addSvgIcon(
      'usersettings',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/usersettings.svg'));
    iconRegistry.addSvgIcon(
      'male',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/male.svg'));
    iconRegistry.addSvgIcon(
      'female',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/female.svg'));
    iconRegistry.addSvgIcon(
      'home',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/home.svg'));

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
