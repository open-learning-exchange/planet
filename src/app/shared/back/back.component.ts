import { Component } from '@angular/core';
import { Router, RoutesRecognized } from '@angular/router';
import {filter, pairwise} from 'rxjs/operators';

@Component({
  selector: 'app-back',
  templateUrl: './back.component.html',
  styleUrls: ['./back.component.scss']
})
export class BackComponent {

  previousRoute: any;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof RoutesRecognized),
      pairwise()
    ).subscribe((event: any[]) => {
      this.previousRoute = event[0].urlAfterRedirects;
    });
  }

  goBack(){
    this.router.navigate([this.previousRoute]);
  }
}
