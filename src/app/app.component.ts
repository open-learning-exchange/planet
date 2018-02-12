import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material';

@Component({
  selector: 'planet-app',
  template: '<div i18n-dir dir="ltr"><router-outlet></router-outlet></div>'
})
export class AppComponent {
  constructor(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
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
  }
}
