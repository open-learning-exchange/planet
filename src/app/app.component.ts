import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { StateService } from './shared/state.service';
import { ThemeService } from './services/theme.service';
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
    private stateService: StateService,
    private themeService: ThemeService
  ) {
    iconRegistry.addSvgIcon(
      'myLibrary',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/library.svg'));
    iconRegistry.addSvgIcon(
      'myCourses',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/school.svg'));
    iconRegistry.addSvgIcon(
      'myLife',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/selfimprovement.svg'));
    iconRegistry.addSvgIcon(
      'myTeams',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/group.svg'));
    iconRegistry.addSvgIcon(
      'feedback',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/feedback.svg'));
    iconRegistry.addSvgIcon(
      'feedbacklist',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/feedbacklist.svg'));
    iconRegistry.addSvgIcon(
      'logout',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logout.svg'));
    iconRegistry.addSvgIcon(
      'usersettings',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/settings.svg'));
    iconRegistry.addSvgIcon(
      'male',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/male.svg'));
    iconRegistry.addSvgIcon(
      'female',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/female.svg'));
    iconRegistry.addSvgIcon(
      'home',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/home.svg'));
    iconRegistry.addSvgIcon(
      'sync',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/sync.svg'));
    iconRegistry.addSvgIcon(
      'pin',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/pin.svg'));
    iconRegistry.addSvgIcon(
      'unpin',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/unpin.svg'));
    iconRegistry.addSvgIcon(
      'instagram',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/instagram.svg'));
    iconRegistry.addSvgIcon(
      'facebook',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/facebook.svg'));
    iconRegistry.addSvgIcon(
      'whatsapp',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/whatsapp.svg'));
    iconRegistry.addSvgIcon(
      'discord',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/discord.svg'));
    iconRegistry.addSvgIcon(
      'x',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/x.svg'));
    iconRegistry.addSvgIcon(
      'youtube',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/youtube.svg'));
    iconRegistry.addSvgIcon(
      'tiktok',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/tiktok.svg'));

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.stateService.requestData('configurations', 'local');
      }
      if (event instanceof NavigationEnd) {
        gtag('config', 'UA-118745384-1', { 'page_path': event.urlAfterRedirects });
      }
    });

    this.themeService.getActiveTheme();
  }
}
