import { Component, Input, EventEmitter, Output, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { TasksService } from '../tasks/tasks.service';

@Component({
  selector: 'planet-teams-member',
  templateUrl: './teams-member.component.html',
  styles: [ `
    .mat-list-item-disabled {
      background-color: white;
    }
  ` ]
})
export class TeamsMemberComponent implements OnInit {

  @Input() member: any;
  @Input() actionMenu: ('remove' | 'leader' | 'title')[];
  @Input() visits: { [_id: string]: number };
  @Input() userStatus = '';
  @Input() teamLeader;
  @Output() actionClick = new EventEmitter<any>();
  memberType: 'community' | 'other' = 'other';
  memberRole: string;
  user = this.userService.get();
  planetCode = this.stateService.configuration.code;

  constructor(
    private userService: UserService,
    private stateService: StateService,
    private tasksService: TasksService
  ) {}

  ngOnInit() {
    this.memberType = this.member.teamId === undefined ? 'community' : 'other';
    this.memberRole = this.member.role ? 'on' : 'off';
  }

  openDialog(actionParams: { member, change: 'remove' | 'leader' | 'title' }) {
    this.actionClick.emit(actionParams);
  }

  toggleTask({ option }) {
    this.tasksService.addTask({ ...option.value, completed: option.selected }).subscribe(() => {
      this.tasksService.getTasks();
    });
  }

}
