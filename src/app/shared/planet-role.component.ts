import { Component, Input, OnChanges } from '@angular/core';


@Component({
  selector: 'planet-role',
  template: `
    @if (formattedRole) {
      <span i18n>{formattedRole, select,
      leader {Leader}
      monitor {Monitor}
      health {Health Provider}
      learner {Learner}
      manager {Manager}
      admin {Admin}
    }</span>
    }
    `,
  imports: []
})
export class PlanetRoleComponent implements OnChanges {

  @Input() role: string;
  formattedRole: string;

  ngOnChanges() {
    this.formattedRole = this.role.replace(/_/g, '');
  }

}
