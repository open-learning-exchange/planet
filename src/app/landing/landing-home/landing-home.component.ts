import { Component } from '@angular/core';

@Component({
   selector: 'planet-landing-home',
   templateUrl: './landing-home.component.html',
   styleUrls: [ './landing-home.scss' ]
 })
 export class LandingHomeComponent {
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
 }
