import { Component, Input, EventEmitter, Output, OnInit, OnChanges } from '@angular/core';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { TasksService } from '../tasks/tasks.service';
import { MatDialog } from '@angular/material/dialog';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';

@Component({
  selector: 'planet-teams-member',
  templateUrl: './teams-member.component.html',
  styles: [ `
    .mat-list-item-disabled {
      background-color: white;
    }
    .mat-card-subtitle p.role-text {
      min-height: 35px;
    }
    .mat-card-tasks {
      max-height: 70px;
      overflow: hidden;
    }
    .mat-caption {
      font-size: 16px;
      font-weight: bold;
    }
  ` ]
})
export class TeamsMemberComponent implements OnInit, OnChanges {

  @Input() member: any;
  @Input() actionMenu: ('remove' | 'leader' | 'title')[];
  @Input() visits: { [_id: string]: number };
  @Input() userStatus = '';
  @Input() leadershipTitle = '';
  @Input() teamLeader;
  @Output() actionClick = new EventEmitter<any>();
  memberType: 'community' | 'other' = 'other';
  // i18n template only accepts strings, not boolean
  hasRole: 'true' | 'false';
  user = this.userService.get();
  planetCode = this.stateService.configuration.code;
  titleChangeText: 'Add' | 'Change';

  constructor(
    private userService: UserService,
    private stateService: StateService,
    private tasksService: TasksService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.memberType = this.member.teamId === undefined ? 'community' : 'other';
    this.hasRole = this.member.role ? 'true' : 'false';
  }

  ngOnChanges() {
    this.titleChangeText = this.leadershipTitle === undefined || this.leadershipTitle === '' ? 'Add' : 'Change';
  }

  openDialog(actionParams: { member, change: 'remove' | 'leader' | 'title' }) {
    this.actionClick.emit(actionParams);
  }

  openMemberDialog(member) {
    this.dialog.open(UserProfileDialogComponent, {
      data: { member },
      maxWidth: '90vw',
      maxHeight: '90vh'
    });
  }

  toggleTask({ option }) {
    this.tasksService.addTask({ ...option.value, completed: option.selected }).subscribe(() => {
      this.tasksService.getTasks();
    });
  }

  truncateText(text: string, maxLength: number = 70): string {
    if (!text) { return ''; }
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

}
