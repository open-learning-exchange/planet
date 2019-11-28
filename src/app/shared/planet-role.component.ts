import { Component, OnInit, Input } from '@angular/core';
import { dedupeShelfReduce } from '../shared/utils';

@Component({
  selector: 'planet-role',
  templateUrl: './planet-role.component.html'
})
export class PlanetRoleComponent implements OnInit {

  @Input() roles: any[];
  @Input() display = 'text';
  @Input() item: any;
  @Input() canManage = false;
  roleList: [];
  allRolesList: { value: string, text: string }[] = [
    { value: '_admin', text: 'Admin' },
    { value: 'learner', text: 'Learner' },
    { value: 'leader', text: 'Leader' },
    { value: 'monitor', text: 'Monitor' },
    { value: 'manager', text: 'Manager' },
    { value: 'health', text: 'Health Provider' }
  ];

  constructor() {}

  ngOnInit() {
    this.roleList = this.roles.reduce(
      dedupeShelfReduce,
      this.display === 'option' ? [] : this.roles.length ? [ 'learner' ] : [ 'Inactive' ]
    );
  }

  toProperRoles(roles) {
    return roles.map(role => this.allRolesList.find(roleObj => roleObj.value === role).text);
  }

}
