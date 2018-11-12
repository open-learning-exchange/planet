import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { dedupeShelfReduce } from '../shared/utils';
import { UserService } from '../shared/user.service';
import { of, empty } from 'rxjs';
import { switchMap, map, takeWhile } from 'rxjs/operators';
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
    private userService: UserService,
  ) {}

  addTeamDialog(shelf, team?) {
    const title = team ? 'Update Team' : 'Create Team';
    const formGroup = {
      name: [ team ? team.name : '', Validators.required ],
      description: team ? team.description : '',
      requests: [ team ? team.requests : [] ]
    };
    return this.dialogsFormService
      .confirm(title, addTeamDialogFields, formGroup)
      .pipe(
        debug('Dialog confirm'),
        switchMap((response: any) => {
          if (response !== undefined) {
            return this.updateTeam({ limit: 12, status: 'active', createdDate: Date.now(), ...team, ...response, updatedDate: Date.now() });
          }
          return empty();
        }),
        switchMap((response) => {
          if (!team) {
            return this.toggleTeamMembership({ _id: response._id }, false, shelf);
          }
          return of(response);
        })
      );
  }

  updateTeam(team: any) {
    return this.couchService.post(this.dbName, team).pipe(switchMap((res: any) => {
      return of({ _rev: res.rev, _id: res.id, ...team });
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

  toggleTeamMembership(team, leaveTeam, shelf) {
    const teamId = team._id;
    shelf = this.updateTeamShelf(teamId, leaveTeam, shelf);
    return this.couchService.put('shelf/' + shelf._id, shelf).pipe(
      switchMap((data) => {
        shelf._rev = data.rev;
        if (this.userService.get()._id === shelf._id) {
          this.userService.shelf = shelf;
        }
        return of(team);
      }),
      switchMap(() => leaveTeam ? this.isTeamEmpty(teamId) : of(team)),
      switchMap((isEmpty) => isEmpty === true ? this.updateTeam({ ...team, status: 'archived' }) : of(team)),
      switchMap((newTeam) => of({ ...team, ...newTeam }))
    );
  }

  getTeamMembers(teamId) {
    return this.couchService.post('shelf/_find', findDocuments({
      'myTeamIds': { '$in': [ teamId ] }
    }, 0));
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

  isTeamEmpty(teamId) {
    return this.getTeamMembers(teamId).pipe(map((data) => data.docs.length === 0));
  }

  sendNotifications(type, members, notificationParams) {
    const notify = members.map((user: any) => {
      if (type === 'request') {
        return this.requestNotification(user._id, notificationParams);
      } else {
        return this.memberAddNotification(user._id, notificationParams);
      }
    });
    return this.couchService.post('notifications/_bulk_docs', { docs: notify });
  }

  memberAddNotification(userId, { team, url, newMembersLength }) {
    return {
      'user': userId,
      'message': newMembersLength + ' member(s) has been added to ' + team.name + ' team. ',
      'link': url,
      'item': team._id,
      'type': 'team',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
  }

  requestNotification(userId, { team, url }) {
    return {
      'user': userId,
      'message': this.userService.get().name + ' has requested to join ' + team.name + ' team. ',
      'link': url,
      'item': team._id,
      'type': 'team',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
  }

}
