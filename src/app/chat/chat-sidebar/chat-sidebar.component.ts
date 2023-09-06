import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss'],
})
export class ChatSidebarComponent implements OnInit {
  @Input() chats: any[];

  ngOnInit() {
    console.log(this.chats);
  }

}
