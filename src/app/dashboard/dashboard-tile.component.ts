import { Component, Input, OnInit, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { tap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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
  @ViewChild('items') itemDiv: ElementRef;

  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private teamsService: TeamsService
  ) { }

  ngOnInit() {}

  removeFromShelf(event, item: any) {
    event.stopPropagation();
    const newIds = this.userService.shelf[this.shelfName].filter((shelfId) => shelfId !== item._id);
    const { _id: userId, planetCode: userPlanetCode } = this.userService.get();
    const teamDoc = { userId, userPlanetCode, teamId: item._id, fromShelf: item.fromShelf };
    const obs = this.shelfName === 'myTeamIds' ?
      this.teamsService.toggleTeamMembership(item, true, teamDoc).pipe(tap(() => this.teamRemoved.emit(item))) :
      this.userService.updateShelf(newIds, this.shelfName);
    obs.subscribe(() => {
      this.planetMessageService.showMessage(item.title + ' removed from ' + this.cardTitle);
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
