import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit, OnDestroy {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = [];
  displayedColumns = [ 'name' ];
  userShelf: any = [];
  userStatus = 'unrelated';
  onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService
  ) {}

  ngOnInit() {
    this.couchService.get('teams/' + this.teamId)
      .subscribe(data => {
        this.team = data;
        this.getMembers();
        this.setStatus(this.team, this.userService.get(), this.userService.shelf);
        this.userShelf = this.userService.shelf;
      });
    this.userService.shelfChange$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(shelf => {
        this.userShelf = shelf;
        this.setStatus(this.team, this.userService.get(), this.userService.shelf);
        this.getMembers();
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getMembers() {
    // find teamId on User shelf
    this.couchService.post('shelf/_find', findDocuments({
      'myTeamIds': { '$in': [ this.teamId ] }
    }, 0)).subscribe((data) => {
      this.members = data.docs.map((mem) => {
        return { name: mem._id.split(':')[1] };
      });
    });
  }

  setStatus(team, user, shelf) {
    this.userStatus = 'unrelated';
    this.userStatus = team.requests.findIndex(id => id === user._id) > -1 ? 'requesting' : this.userStatus;
    this.userStatus = shelf.myTeamIds.findIndex(id => id === team._id) > -1 ? 'member' : this.userStatus;
  }

  toggleMembership(teamId, leaveTeam) {
    this.teamsService.toggleTeamMembership(teamId, leaveTeam, this.userShelf).subscribe(() => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

  requestToJoin() {
    this.teamsService.requestToJoinTeam(this.team, this.userShelf._id).subscribe((newTeam) => {
      this.team = newTeam;
      this.setStatus(this.team, this.userService.get(), this.userService.shelf);
      this.planetMessageService.showMessage('Request to join team sent');
    });
  }

}
