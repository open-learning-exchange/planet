import { Component } from '@angular/core';

@Component({
  templateUrl: './community-link-dialog.component.html',
})
export class CommunityLinkDialogComponent {

  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'resources', title: 'Library' },
    { db: 'teams', title: 'Teams', selector: { type: 'team' } },
    { db: 'teams', title: 'Enterprises', selector: { type: 'enterprise' } }
  ];

}
