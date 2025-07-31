import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-federated-results',
  template: `
    <div *ngIf="results && results.length" class="federated-results">
      <mat-list>
        <mat-list-item *ngFor="let item of results">
          <a [routerLink]="item.type === 'course' ? ['/courses/view', item._id] : ['/resources/view', item._id]">
            {{ item.doc.courseTitle || item.doc.title }}
            <span class="type-label">({{ item.type }})</span>
          </a>
        </mat-list-item>
      </mat-list>
    </div>
  `,
  styles: [
    `.federated-results { margin-top: 10px; }`,
    `.type-label { margin-left: 4px; font-size: 0.75em; }`
  ]
})
export class FederatedResultsComponent {
  @Input() results: any[] = [];
}
