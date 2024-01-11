import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  goBack(): void {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

}
