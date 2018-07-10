import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './teams-view.component.html'
})
export class TeamsViewComponent implements OnInit {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = new MatTableDataSource();
  displayedColumns = [ 'name' ];
  userShelf: any = [];

  constructor(
      private couchService: CouchService,
      private userService: UserService,
      private route: ActivatedRoute,
      private planetMessageService: PlanetMessageService
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
      this.members.data = data.docs.map((mem) => {
        if (mem._id === this.userService.get()._id) {
          this.team.isMember = true;
        }
        return { name: mem._id.split(':')[1] };
      });
    });
  }

  joinTeam(teamId, becomeMember) {
    this.updateTeam(teamId, becomeMember).subscribe(data => {
      this.userShelf._rev = data.rev;
      this.userService.shelf = this.userShelf;
      this.team.isMember = !becomeMember;
      this.getMembers();
      const msg = becomeMember ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

  updateTeam(teamId, becomeMember) {
    let myTeamIds = this.userService.shelf.myTeamIds;
    if (becomeMember) {
      myTeamIds.splice(myTeamIds.indexOf(teamId), 1);
    } else {
      myTeamIds = myTeamIds.concat([ teamId ]);
    }
    this.userShelf.myTeamIds = myTeamIds;
    return this.couchService.put('shelf/' + this.userService.get()._id, { ...this.userShelf });
  }

}
