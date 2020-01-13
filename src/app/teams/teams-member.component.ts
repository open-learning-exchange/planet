import { Component, Input, OnChanges, EventEmitter, Output, OnInit } from '@angular/core';
import { MatTableDataSource, MatDialog } from '@angular/material';
import { Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { TeamsService } from './teams.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { millisecondsToDay } from '../meetups/constants';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'planet-teams-member',
  templateUrl: './teams-member.component.html',
})
export class TeamsMemberComponent {

  @Input() member: any;
  @Input() actionMenu: ('remove' | 'leader' | 'title')[];
  @Input() visits: { [_id: string]: number };
  @Input() userStatus = '';
  @Output() actionClick = new EventEmitter<any>();
  user = this.userService.get();

  constructor(
    private userService: UserService
  ) {}

  ngOnInit() {
    console.log(this.member);
  }

  openDialog(actionParams: { member, change: 'remove' | 'leader' | 'title' }) {
    this.actionClick.emit(actionParams);
  }

}
