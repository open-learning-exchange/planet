import { Component, Input, EventEmitter, Output, OnInit, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
import { UserService } from '@shared/auth/user.service';
import { StateService } from '@shared/state.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersProfileDialogService } from '../users/users-profile/users-profile-dialog.service';
import { DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatSelectionList, MatSelectionListChange, MatListOption, MatListItemTitle } from '@angular/material/list';
import { TruncateTextPipe } from '@shared/text/truncate-text.pipe';
import { TimeAgoPipe } from '@shared/text/time-ago.pipe';

const defaultAvatar = 'assets/image.png';
// Must match the length of $initials-palette in _variables.scss, which owns the colors.
const initialsColorCount = 12;

@Component({
  selector: 'planet-teams-member',
  templateUrl: './teams-member.component.html',
  styleUrls: [ './teams-member.component.scss' ],
  imports: [
    MatButton,
    MatIconButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatSelectionList,
    MatListOption,
    MatListItemTitle,
    DatePipe,
    TruncateTextPipe,
    TimeAgoPipe
  ]
})
export class TeamsMemberComponent implements OnInit, OnChanges {

  @Input() member: any;
  @Input() actionMenu: ('remove' | 'leader' | 'title')[] = [];
  @Input() visits: { [_id: string]: number };
  @Input() userStatus = '';
  @Input() leadershipTitle = '';
  @Input() teamLeader;
  @Input() @HostBinding('class.request-tile') isRequest = false;
  @Input() canManageRequests = false;
  @Input() disableAccept = false;
  @Output() actionClick = new EventEmitter<any>();
  @Output() requestAction = new EventEmitter<'added' | 'rejected'>();
  memberType: 'community' | 'other' = 'other';
  // i18n template only accepts strings, not boolean
  hasRole: 'true' | 'false';
  user = this.userService.get();
  planetCode = this.stateService.configuration.code;
  titleChangeText: 'Add' | 'Change';
  displayName = '';
  initials = '';
  initialsColorIndex = 0;
  hasImage = false;

  constructor(
    private userService: UserService,
    private stateService: StateService,
    private tasksService: TasksService,
    private usersProfileDialogService: UsersProfileDialogService
  ) {}

  get isTeamLeader() {
    return !!this.teamLeader && this.member?.userId === this.teamLeader.userId &&
      this.member?.userPlanetCode === this.teamLeader.userPlanetCode;
  }

  get isSelf() {
    return this.member?.userId === this.user._id && this.member?.userPlanetCode === this.planetCode;
  }

  ngOnInit() {
    this.memberType = this.member.teamId === undefined ? 'community' : 'other';
    this.hasRole = this.member.role ? 'true' : 'false';
  }

  ngOnChanges(changes: SimpleChanges) {
    this.titleChangeText = this.leadershipTitle === undefined || this.leadershipTitle === '' ? 'Add' : 'Change';
    // Only rebuild the avatar when the member itself changes. Both call sites rebuild
    // actionMenu as a new array literal every change detection pass, so an unguarded
    // ngOnChanges would keep resetting hasImage and re-request a failing avatar forever.
    if (!changes.member) {
      return;
    }
    const userDoc = this.member?.userDoc;
    this.displayName = userDoc?.fullName || userDoc?.firstName || userDoc?.doc?.fullName || userDoc?.doc?.firstName ||
      this.member?.name || '';
    this.hasImage = !!this.member?.avatar && this.member.avatar !== defaultAvatar;
    this.setInitials(this.displayName);
  }

  setInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
    const first = (parts[0] || '?').charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    this.initials = (first + last).toUpperCase();
    const hash = Array.from(name).reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 104729, 0);
    this.initialsColorIndex = hash % initialsColorCount;
  }

  openDialog(actionParams: { member, change: 'remove' | 'leader' | 'title' }) {
    this.actionClick.emit(actionParams);
  }

  openMemberDialog(member) {
    this.usersProfileDialogService.open({ member });
  }

  toggleTask(event: MatSelectionListChange) {
    const [ option ] = event.options;

    this.tasksService.addTask({ ...option.value, completed: option.selected }).subscribe(() => {
      this.tasksService.getTasks();
    });
  }

}
