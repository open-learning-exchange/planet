import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  template: `{{message}}`,
})
export class NotificationViewComponent implements OnInit {
  message: string;
  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
        this.message = params['message'];
    });
  }
}
