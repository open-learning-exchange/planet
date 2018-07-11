import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { of, forkJoin, empty } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';

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
      description: ''
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

  createTeam(post: any) {
    return this.couchService.post(this.dbName + '/', post);
  }

  toggleTeamMembership(teamId, leaveTeam, shelf) {
    shelf = this.updateTeam(teamId, leaveTeam, shelf);
    return this.couchService.put('shelf/' + this.userService.get()._id, shelf).pipe(switchMap((data) => {
      shelf._rev = data.rev;
      if (this.userService.get()._id === shelf._id) {
        this.userService.shelf = shelf;
      }
      return of(data);
    }));
  }

  updateTeam(teamId, leaveTeam, shelf) {
    let myTeamIds = shelf.myTeamIds;
    if (leaveTeam) {
      myTeamIds.splice(myTeamIds.indexOf(teamId), 1);
    } else {
      myTeamIds = myTeamIds.concat([ teamId ]);
    }
    return { ...shelf, myTeamIds };
  }

}
