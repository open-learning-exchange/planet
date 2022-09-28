import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { CheckMobileService } from '../../shared/checkMobile.service';

@Component({
   selector: 'planet-landing-home',
   templateUrl: './landing-home.component.html',
   styleUrls: [ './landing-home.scss' ],
   encapsulation: ViewEncapsulation.None
 })
 export class LandingHomeComponent {

  constructor(
    private checkMobileService: CheckMobileService
  ) {}
  isMobile: boolean = this.checkMobileService.checkIsMobile();

  header = {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  };
  buttonText = {
    today: 'Hoy',
    month: 'Mes',
    day: 'Día',
    week: 'Semana'
  };

  @HostListener('window:resize') OnResize() {
    this.isMobile = this.checkMobileService.checkIsMobile();
  }
 }
