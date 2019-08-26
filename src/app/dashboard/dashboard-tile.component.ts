import { Component, Input, OnInit, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { tap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent implements OnInit {
  @Input() cardTitle: string;
  @Input() color: string;
  @Input() itemData;
  @Input() link;
  @Input() emptyLink = '/';
  @Input() shelfName: string;
  @Output() teamRemoved = new EventEmitter<any>();
  @ViewChild('items', { static: false }) itemDiv: ElementRef;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;

  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private teamsService: TeamsService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {}

  removeFromShelf(event, item: any) {
    event.stopPropagation();
    const newIds = this.userService.shelf[this.shelfName].filter((shelfId) => shelfId !== item._id);
    const { _id: userId, planetCode: userPlanetCode } = this.userService.get();
    const teamDoc = { userId, userPlanetCode, teamId: item._id, fromShelf: item.fromShelf };
    this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.shelfName === 'myTeamIds' ?
            this.teamsService.toggleTeamMembership(item, true, teamDoc).pipe(tap(() => this.teamRemoved.emit(item))) :
            this.userService.updateShelf(newIds, this.shelfName),
          onNext: () => {
            this.dialogPrompt.close();
            this.planetMessageService.showMessage(item.title + ' removed from ' + this.cardTitle);
          },
          onError: () => this.planetMessageService.showMessage('there was a error removing ' + item.title)
        },
        changeType: 'remove',
        type: 'team',
        displayName: item.title
      }
    });
  }
  
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.itemData, event.previousIndex, event.currentIndex);
    const ids = [ ...this.userService.shelf[this.shelfName] ];
    ids.splice(event.currentIndex, 0, ids.splice(event.previousIndex, 1)[0]);
    this.userService.updateShelf(ids, this.shelfName).subscribe(
      () => {},
      () => {
        this.planetMessageService.showAlert('There was an error reordering ' + this.cardTitle);
        moveItemInArray(this.itemData, event.currentIndex, event.previousIndex);
      }
    );
  }
}
