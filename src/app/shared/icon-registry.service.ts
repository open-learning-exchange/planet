import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class IconRegistryService {

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) { }

  registerIcons(): void {
    this.iconRegistry.addSvgIcon(
      'myLibrary',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/library.svg'));
    this.iconRegistry.addSvgIcon(
      'myCourses',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/school.svg'));
    this.iconRegistry.addSvgIcon(
      'myLife',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/selfimprovement.svg'));
    this.iconRegistry.addSvgIcon(
      'myTeams',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/group.svg'));
    this.iconRegistry.addSvgIcon(
      'feedback',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/feedback.svg'));
    this.iconRegistry.addSvgIcon(
      'feedbacklist',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/feedbacklist.svg'));
    this.iconRegistry.addSvgIcon(
      'logout',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logout.svg'));
    this.iconRegistry.addSvgIcon(
      'usersettings',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/settings.svg'));
    this.iconRegistry.addSvgIcon(
      'male',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/male.svg'));
    this.iconRegistry.addSvgIcon(
      'female',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/female.svg'));
    this.iconRegistry.addSvgIcon(
      'home',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/home.svg'));
    this.iconRegistry.addSvgIcon(
      'sync',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/sync.svg'));
    this.iconRegistry.addSvgIcon(
      'pin',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/pin.svg'));
    this.iconRegistry.addSvgIcon(
      'unpin',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/unpin.svg'));
    this.iconRegistry.addSvgIcon(
      'instagram',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/instagram.svg'));
    this.iconRegistry.addSvgIcon(
      'facebook',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/facebook.svg'));
    this.iconRegistry.addSvgIcon(
      'whatsapp',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/whatsapp.svg'));
    this.iconRegistry.addSvgIcon(
      'discord',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/discord.svg'));
    this.iconRegistry.addSvgIcon(
      'x',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/x.svg'));
    this.iconRegistry.addSvgIcon(
      'youtube',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/youtube.svg'));
    this.iconRegistry.addSvgIcon(
      'tiktok',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/tiktok.svg'));
  }
}
