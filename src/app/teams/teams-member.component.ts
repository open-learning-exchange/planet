import { Component, Input, EventEmitter, Output, OnInit, OnChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { TasksService } from '../tasks/tasks.service';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';
import { MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatSelectionList, MatListOption, MatListItemTitle } from '@angular/material/list';
import { TruncateTextPipe } from '../shared/truncate-text.pipe';

@Component({
  selector: 'planet-teams-member',
  templateUrl: './teams-member.component.html',
  styles: [`
    .mat-mdc-list-item-disabled {
      background-color: white;
    }
    .mat-caption {
      font-size: 16px;
      font-weight: bold;
    }
    .member-name {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }
    .avatar-spacing {
      margin-right: 5px;
    }
  `],
  imports: [
    MatCardHeader, MatCardAvatar, MatCardTitle, MatCardSubtitle, NgIf, MatIconButton, MatMenuTrigger,
    MatIcon, MatMenu, MatMenuItem, MatCardContent, MatSelectionList, NgFor, MatListOption, MatListItemTitle,
    DatePipe, TruncateTextPipe
  ]
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

}
