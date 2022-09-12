import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'planet-landing-nav',
  templateUrl: './landing-nav.component.html',
  styleUrls: [ './landing-nav.scss' ]
})

export class LandingNavbarComponent {
  baseUrl = environment.uplanetAddress;
}
