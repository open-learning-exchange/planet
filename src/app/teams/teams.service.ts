import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { dedupeShelfReduce } from '../shared/utils';
import { UserService } from '../shared/user.service';
import { of, empty } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';
import { findDocuments } from '../shared/mangoQueries';

const addTeamDialogFields = [ {
  'type': 'textbox',
  'name': 'name',
  'placeholder': 'Name',
  'required': true
}, {
  'type': 'textarea',
  'name': 'description',
  'placeholder': 'Detail',
  'required': false
} ];

@Injectable()
export class TeamsService {

  dbName = 'teams';

  constructor(
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private userService: UserService
  ) {}

  addTeamDialog(shelf) {
    const title = 'Create Team';
    const formGroup = {
      name: [ '', Validators.required ],
      description: '',
      requests: [ [] ]
    };
    return this.dialogsFormService
      .confirm(title, addTeamDialogFields, formGroup)
      .pipe(
        debug('Dialog confirm'),
        switchMap((response) => {
          if (response !== undefined) {
            return this.createTeam(response);
          }
          return empty();
        }),
        switchMap((response) => {
          return this.toggleTeamMembership(response.id, false, shelf);
        })
      );
  }

  createTeam(team: any) {
    return this.couchService.post(this.dbName + '/', { ...team, limit: '12', status: 'active' });
  }

  updateTeam(team: any) {
    return this.couchService.put(this.dbName + '/' + team._id, team).pipe(switchMap((res: any) => {
      team._rev = res.rev;
      return of(team);
    }));
  }

  requestToJoinTeam(team, userId) {
    team = {
      ...team,
      requests: team.requests.concat([ userId ]).reduce(dedupeShelfReduce, [])
    };
    return this.updateTeam(team);
  }

  removeFromRequests(team, userId) {
    const newRequestArray = team.requests.filter(id => id !== userId);
    return this.updateTeam({ ...team, requests: newRequestArray });
  }

  toggleTeamMembership(teamId, leaveTeam, shelf) {
    shelf = this.updateTeamShelf(teamId, leaveTeam, shelf);
    return this.couchService.put('shelf/' + shelf._id, shelf).pipe(switchMap((data) => {
      shelf._rev = data.rev;
      if (this.userService.get()._id === shelf._id) {
        this.userService.shelf = shelf;
      }
      return of(data);
    }),
    switchMap((shelfData) => {
      if (leaveTeam) {
        return this.updateArchiveMember(teamId);
      }
      return of(shelfData);
    })
  );
  }

  updateTeamShelf(teamId, leaveTeam, shelf) {
    let myTeamIds = shelf.myTeamIds || [];
    if (leaveTeam) {
      myTeamIds.splice(myTeamIds.indexOf(teamId), 1);
    } else {
      myTeamIds = myTeamIds.concat([ teamId ]).reduce(dedupeShelfReduce, []);
    }
    return { ...shelf, myTeamIds };
  }

  updateArchiveMember(teamId) {
    // find teamId on User shelf
    return this.couchService.post('shelf/_find', findDocuments({
      'myTeamIds': { '$in': [ teamId ] }
    }, 0)).pipe(switchMap((data) => {
      if (data.docs.length === 0) {
        return this.couchService.get('teams/' + teamId).pipe(switchMap(teamData => {
          return this.updateTeam({ ...teamData, status: 'archived' });
        }));
      }
      return of(data);
    }));
  }

}
