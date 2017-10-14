import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'planet-list-item',
  templateUrl: './list-item.component.html'
})
export class ListItemComponent implements OnInit {
  @Input() title: String;
  @Input() badoom;
  constructor() {}

  ngOnInit() {}
}
