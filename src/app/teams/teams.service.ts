import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { of, empty, forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { findDocuments } from '../shared/mangoQueries';
import { CustomValidators } from '../validators/custom-validators';
import { StateService } from '../shared/state.service';
import { ValidatorService } from '../validators/validator.service';

const addTeamDialogFields = [ {
  'type': 'textbox',
  'name': 'name',
  'placeholder': 'Name',
  'required': true
}, {
  'type': 'markdown',
  'name': 'description',
  'placeholder': 'Description',
  'required': false
} ];

@Injectable()
export class TeamsService {

  dbName = 'teams';

  constructor(
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private stateService: StateService,
    private validatorService: ValidatorService
  ) {}

  addTeamDialog(userId: string, team: any = {}) {
    const configuration = this.stateService.configuration;
    const title = team._id ? 'Update Team' : 'Create Team';
    const formGroup = {
      name: [
        team.name || '', CustomValidators.required,
        ac => this.validatorService.isUnique$(this.dbName, 'name', ac, { selectors: { _id: { $ne: team._id || '' }, status: 'active' } })
      ],
      description: team.description || '',
      requests: [ team.requests || [] ],
      teamType: [ team._id ? { value: team.teamType || 'local', disabled: true } : 'local' ]
    };
    return this.dialogsFormService.confirm(title, [ ...addTeamDialogFields, this.typeFormField(configuration) ], formGroup, true)
      .pipe(
        switchMap((response: any) => response !== undefined ?
          this.updateTeam(
            { limit: 12, status: 'active', createdDate: this.couchService.datePlaceholder, teamPlanetCode: configuration.code,
              parentCode: configuration.parentCode, ...team, ...response, createdBy: userId }
          ) :
          empty()
        ),
        switchMap((response) => !team._id ?
          this.toggleTeamMembership(response, false, { userId, userPlanetCode: configuration.code, isLeader: true }) :
          of(response)
        )
      );
  }

  typeFormField(configuration) {
    return {
      'type': 'selectbox',
      'name': 'teamType',
      'placeholder': 'Team Type',
      'options': [
        { 'value': 'sync', 'name': configuration.planetType === 'community' ? 'Connect with nation' : 'Connect with earth' },
        { 'value': 'local', 'name': 'Local team' }
      ]
    };
  }

  updateTeam(team: any) {
    return this.couchService.updateDocument(this.dbName, team).pipe(switchMap((res: any) => {
      return of({ ...team, _rev: res.rev, _id: res.id });
    }));
  }

  requestToJoinTeam(team, userId) {
    const userPlanetCode = this.stateService.configuration.code;
    return this.couchService.post(this.dbName, this.membershipProps(team, { userId, userPlanetCode }, 'request'));
  }

  removeFromRequests(team, memberInfo) {
    return this.couchService.findAll(this.dbName, findDocuments(this.membershipProps(team, memberInfo, 'request'))).pipe(
      switchMap((docs: any[]) => this.couchService.bulkDocs(this.dbName, docs.map(doc => ({ ...doc, _deleted: true }))))
    );
  }

  toggleTeamMembership(team, leaveTeam, memberInfo) {
    return (memberInfo.fromShelf === true && leaveTeam === true ?
      this.updateShelf(memberInfo) :
      this.updateMembershipDoc(team, leaveTeam, memberInfo)
    ).pipe(
      switchMap(() => leaveTeam ? this.isTeamEmpty(team) : of(team)),
      switchMap((isEmpty) => isEmpty === true ? this.updateTeam({ ...team, status: 'archived' }) : of(team)),
      switchMap((newTeam) => of({ ...team, ...newTeam }))
    );
  }

  updateMembershipDoc(team, leaveTeam, memberInfo) {
    const deleted = leaveTeam ? { _deleted: true } : {};
    const membershipProps = this.membershipProps(team, memberInfo, 'membership');
    return this.couchService.findAll(this.dbName, findDocuments(membershipProps)).pipe(
      map((docs) => docs.length === 0 ? [ membershipProps ] : docs),
      switchMap((membershipDocs: any[]) => this.couchService.bulkDocs(
        this.dbName, membershipDocs.map(membershipDoc => ({ ...membershipDoc, ...deleted }))
      ))
    );
  }

  // Included for backwards compatibility for older teams where membership was stored in shelf.  Only for member leaving a team.
  updateShelf(membershipDoc) {
    const { userId, teamId } = membershipDoc;
    return this.couchService.get('shelf/' + userId).pipe(switchMap(shelf =>
      this.userService.updateShelf(shelf.myTeamIds.filter(myTeamId => myTeamId !== teamId), 'myTeamIds')
    ));
  }

  membershipProps(team, memberInfo, docType) {
    const { userId, userPlanetCode, isLeader } = memberInfo;
    const { _id: teamId, teamPlanetCode, teamType } = team;
    return {
      teamId, userId, teamPlanetCode, teamType, userPlanetCode, docType, isLeader
    };
  }

  getTeamMembers(team, withAllLinks = false) {
    const typeObj = withAllLinks ? {} : { docType: 'membership' };
    return forkJoin([
      this.couchService.findAll(this.dbName, findDocuments({ teamId: team._id, teamPlanetCode: team.teamPlanetCode, ...typeObj })),
      this.couchService.findAll('shelf', findDocuments({ 'myTeamIds': { '$in': [ team._id ] } }, 0))
    ]).pipe(map(([ membershipDocs, shelves ]) => [
      ...membershipDocs,
      ...shelves.map((shelf: any) => ({ ...shelf, fromShelf: true, docType: 'membership', userId: shelf._id, teamId: team._id }))
    ]));
  }

  getTeamResources(linkDocs: any[]) {
    return this.stateService.getCouchState('resources', 'local').pipe(map((resources: any[]) =>
      linkDocs.map(linkDoc => ({
        linkDoc,
        resource: resources.find(resource => resource._id === linkDoc.resourceId)
      }))
    ));
  }

  isTeamEmpty(team) {
    return this.getTeamMembers(team).pipe(map((docs) => docs.length === 0));
  }

  sendNotifications(type, members, notificationParams) {
    const notifications = members.filter((user: any) => {
      const userId = user.userId || user._id;
      return this.userService.get()._id !== userId && user.name !== 'satellite';
    }).map((user: any) => {
      return this.teamNotification(this.teamNotificationMessage(type, notificationParams), user, notificationParams);
    });
    return this.couchService.updateDocument('notifications/_bulk_docs', { docs: notifications });
  }

  teamNotificationMessage(type, { team, newMembersLength = '' }) {
    switch (type) {
      case 'message':
        return `<b>${this.userService.get().name}</b> has posted a message on <b>"${team.name}"</b> team.`;
      case 'request':
        return `<b>${this.userService.get().name}</b> has requested to join <b>"${team.name}"</b> team.`;
      case 'added':
        return `You have been added to <b>"${team.name}"</b> team.`;
      case 'rejected':
        return `You have not been accepted to <b>"${team.name}"</b> team.`;
      case 'removed':
        return `You have been removed from <b>"${team.name}"</b> team.`;
      default:
        return `${newMembersLength} member(s) has been added to <b>${team.name}</b> team.`;
    }
  }

  teamNotification(message, user, { team, url }) {
    const userId = user.userId || user._id;
    return {
      'user': userId,
      message,
      'link': url,
      'item': team._id,
      'type': 'team',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
      userPlanetCode: user.userPlanetCode
    };
  }

  teamActivity(team: any, activity = 'teamVisit') {
    const data = {
      'teamId': team._id,
      'title': team.title,
      'user': this.userService.get().name,
      'type': activity,
      'teamType': team.teamType,
      'teamPlanetCode': team.teamPlanetCode,
      'time': this.couchService.datePlaceholder,
      'createdOn': this.stateService.configuration.code,
      'parentCode': this.stateService.configuration.parentCode
    };
    return this.couchService.updateDocument('team_activities', data);
  }

  linkResourcesToTeam(resources, team) {
    const { teamPlanetCode, teamType } = team;
    const links = resources.map(
      resource => ({
        resourceId: resource.doc._id, sourcePlanet: resource.doc.sourcePlanet,
        teamId: team._id, teamPlanetCode, teamType, docType: 'resourceLink'
      })
    );
    if (teamPlanetCode !== this.stateService.configuration.code) {
      this.updateSendDocs(resources, teamPlanetCode);
    }
    return this.couchService.bulkDocs('teams', links);
  }

  updateSendDocs(resources, sendTo) {
    this.couchService.bulkDocs('send_items', resources.map(resource => ({ db: 'resources', sendTo, item: resource }))).subscribe();
  }

}
