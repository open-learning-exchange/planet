import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = [];
  displayedColumns = [ 'name' ];
  userShelf: any = [];

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService
  ) {}

  ngOnInit() {
    this.couchService.get('teams/' + this.teamId )
      .subscribe(data => {
        this.team = { isMember: false, ...data };
        this.getMembers();
        this.userShelf = this.userService.shelf;
      });
  }

  getMembers() {
    // find teamId on User shelf
    this.couchService.post('shelf/_find', findDocuments({
      'myTeamIds': { '$in': [ this.teamId ] }
    }, 0)).subscribe((data) => {
      this.members = data.docs.map((mem) => {
        if (mem._id === this.userService.get()._id) {
          this.team.isMember = true;
        }
        return { name: mem._id.split(':')[1] };
      });
    });
  }

  toggleMembership(teamId, leaveTeam) {
    this.teamsService.toggleTeamMembership(teamId, leaveTeam, this.userShelf).subscribe(() => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team');
      this.getMembers();
    });
  }

}
