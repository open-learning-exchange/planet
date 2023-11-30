import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent {
  @Input() showToolbar = true;
  @Input() dataPreload;

  constructor(private route: ActivatedRoute, private router: Router) {}

  goBack() {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }
}
