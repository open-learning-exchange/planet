import { Component } from '@angular/core';

@Component({
  selector: 'landing-news-detail',
  templateUrl: './newsitem-detail.component.html',
  styles: [`
   .item-details-container {
    & h3 {
      color: #016eb1;
    }
    & blockquote {
      margin: 0;
      padding: 0 15px;
      border-left: solid 4px #016eb1;
    }
  }
  
  .item-details-content {
      display: flex;
      justify-content: space-between;
  }  
   `]
})
export class NewsItemDetailsComponent {

}
