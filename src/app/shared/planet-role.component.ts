import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-role',
  template: `
    <span *ngIf="role" i18n>{role, select,
      leader {Leader}
      monitor {Monitor}
      health {Health Provider}
      learner {Learner}
      manager {Manager}
    }</span>
  `
})
export class PlanetRoleComponent {

  @Input() role: string;

}
