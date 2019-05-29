import { Component, Input } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'planet-news-list',
  templateUrl: './news-list.component.html',
  styles: [ `
    :host mat-card {
      margin: 0.25rem;
    }
  ` ]
})
export class NewsListComponent {

  @Input() items: any[] = [];
  currentUser = this.userService.get();

  constructor(
    private userService: UserService
  ) {}

}
