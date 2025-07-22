import { Injectable } from '@angular/core';
import { of, empty, forkJoin, Observable } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { findDocuments } from '../shared/mangoQueries';
import { CustomValidators } from '../validators/custom-validators';
import { StateService } from '../shared/state.service';
import { ValidatorService } from '../validators/validator.service';
import { toProperCase } from '../shared/utils';
import { UsersService } from '../users/users.service';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { truncateText } from '../shared/utils';

const nameField = {
  'type': 'textbox',
  'name': 'name',
  'placeholder': $localize`Name`,
  'required': true
};
const descriptionField = {
  'type': 'markdown',
  'name': 'description',
  'placeholder': $localize`What is your team\'s plan?`,
  'required': false
};
const enterpriseDescField = [
  {
    'type': 'markdown',
    'name': 'description',
    'placeholder': $localize`What is your enterprise\'s Mission?`,
    'required': false
  }, {
    'type': 'markdown',
    'name': 'services',
    'placeholder': $localize`What are the Services your enterprise provides?`,
    'required': false
  }, {
    'type': 'markdown',
    'name': 'rules',
    'placeholder': $localize`What are the Rules of your enterprise?`,
    'required': false
  }
];
const publicField = {
  'type': 'toggle',
  'name': 'public',
  'label': $localize`Public`
};

@Injectable({
  providedIn: 'root'
})
export class TeamsService {

  dbName = 'teams';

  constructor(
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private usersService: UsersService,
    private stateService: StateService,
    private validatorService: ValidatorService
  ) {}

  addTeamDialog(userId: string, type: 'team' | 'enterprise' | 'services', team: any = {}) {
    const configuration = this.stateService.configuration;
    // Requires a translation map with $localize and custom message IDs for dialog titles
    const key = `${team._id ? 'update' : 'create'}-${type === 'enterprise' ? 'enterprise' : 'team'}`;
    const title = {
      'create-team': $localize`:@@create-team:Create Team`,
      'update-team': $localize`:@@update-team:Update Team`,
      'create-enterprise': $localize`:@@create-enterprise:Create Enterprise`,
      'update-enterprise': $localize`:@@update-enterprise:Update Enterprise`
    }[key];
    const nameControl = type !== 'services' ? { name:
      [
        team.name || '', CustomValidators.required,
        ac => this.validatorService.isUnique$(
          this.dbName, 'name', ac, { selectors: { _id: { $ne: team._id || '' }, status: 'active', type } }
        )
      ]
    } : {};
    const formGroup = {
      ...nameControl,
      description: team.description || '',
      services: team.services || '',
      rules: team.rules || '',
      requests: [ team.requests || [] ],
      teamType: [ { value: team.teamType || 'local', disabled: team._id !== undefined } ],
      public: [ team.public || false ]
    };
    return this.dialogsFormService.confirm(title, this.addTeamFields(configuration, type), formGroup, true)
      .pipe(
        switchMap((response: any) => response !== undefined ?
          this.updateTeam(
            { limit: 12, status: 'active', createdDate: this.couchService.datePlaceholder, teamPlanetCode: configuration.code,
              parentCode: configuration.parentCode, createdBy: userId, ...team, ...response, type }
          ) :
          empty()
        ),
        switchMap((response) => !team._id ?
          this.toggleTeamMembership(response, false, { userId, userPlanetCode: configuration.code, isLeader: true }) :
          of(response)
        )
      );
  }

  addTeamFields(configuration, type) {
    const typeField = {
      'type': 'selectbox',
      'name': 'teamType',
      'placeholder': $localize`Team Type`,
      'options': [
        { 'value': 'sync', 'name': $localize`${configuration.planetType === 'community' ? 'Connect with nation' : 'Connect with earth'}` },
        { 'value': 'local', 'name': $localize`Local team` }
      ]
    };
    return [
      type === 'services' ? [] : nameField,
      type === 'enterprise' ? enterpriseDescField : descriptionField,
      type === 'team' ? typeField : [],
      publicField
    ].flat();
  }

  updateTeam(team: any) {
    return this.couchService.updateDocument(this.dbName, team).pipe(switchMap((res: any) => {
      return of({ ...team, _rev: res.rev, _id: res.id });
    }));
  }

  requestToJoinTeam(team, user) {
    const userPlanetCode = this.stateService.configuration.code;
    return this.couchService.post(this.dbName, this.membershipProps(team, { userId: user._id, userPlanetCode }, 'request')).pipe(
      switchMap(() => team.teamType === 'sync' ? this.userService.addImageForReplication(true, [ user ]) : of({}))
    );
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

  archiveTeam(team) {
    return () => this.updateTeam({ ...team, status: 'archived' });
  }

  deleteCommunityLink(team) {
    const communityId = planetAndParentId(this.stateService.configuration);
    const route = this.teamLinkRoute(team.type, team._id);
    return this.getTeamMembers(communityId, true).pipe(switchMap((links) => {
      const link = links.find(val => val.route === route);
      return link ? this.couchService.updateDocument('teams', { ...link, _deleted: true }) : of({});
    }));
  }

  updateMembershipDoc(team, leaveTeam, memberInfo) {
    const deleted = leaveTeam ? { _deleted: true } : {};
    const membershipProps = this.membershipProps(team, memberInfo, 'membership');
    return this.couchService.findAll(this.dbName, findDocuments(membershipProps)).pipe(
      map((docs) => docs.length === 0 ? [ membershipProps ] : docs),
      switchMap((membershipDocs: any[]) => this.couchService.bulkDocs(
        this.dbName, membershipDocs.map(membershipDoc => ({ ...membershipDoc, ...memberInfo, ...deleted }))
      ))
    );
  }

  updateAdditionalDocs(newDocs: any[], team, docType: 'transaction' | 'report', opts?: any) {
    const { _id: teamId, teamType, teamPlanetCode } = team;
    const datePlaceholder = this.couchService.datePlaceholder;
    const docs = newDocs.map(newDoc => ({
      createdDate: datePlaceholder,
      ...newDoc,
      updatedDate: datePlaceholder,
      teamId,
      teamType,
      teamPlanetCode,
      docType
    }));
    return this.couchService.bulkDocs(this.dbName, docs, opts);
  }

  changeTeamLeadership(oldLeader, newLeader) {
    return this.couchService.bulkDocs(this.dbName, [ { ...newLeader, isLeader: true }, { ...oldLeader, isLeader: false } ]);
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
    const selector = {
      teamId: team._id,
      teamPlanetCode: team.teamPlanetCode,
      status: { '$or': [ { '$exists': false }, { '$ne': 'archived' } ] },
      ...(withAllLinks ? {} : { docType: 'membership' })
    };
    this.usersService.requestUserData();
    return forkJoin([
      this.couchService.findAll(this.dbName, findDocuments(selector)),
      this.couchService.findAll('shelf', findDocuments({ 'myTeamIds': { '$in': [ team._id ] } }, 0)),
      this.usersService.usersListener(true).pipe(take(1)),
      this.couchService.findAll('attachments')
    ]).pipe(map(([ membershipDocs, shelves, users, attachments ]: any[]) => [
      ...membershipDocs.map(doc => ({
        ...doc,
        userDoc: users.find(user => (user.doc.couchId || user._id) === doc.userId && user.doc.planetCode === doc.userPlanetCode),
        attachmentDoc: attachments.find(attachment => attachment._id === `${doc.userId}@${doc.userPlanetCode}`)
      })),
      ...shelves.map((shelf: any) => ({ ...shelf, fromShelf: true, docType: 'membership', userId: shelf._id, teamId: team._id }))
    ]));
  }

  getTeamResources(linkDocs: any[]) {
    return this.stateService.getCouchState('resources', 'local').pipe(map((resources: any[]) =>
      linkDocs.map(linkDoc => ({
        linkDoc,
        resource: resources.find(resource => resource._id === linkDoc.resourceId) || {}
      }))
        .filter(resource => resource.linkDoc.title || resource.resource && resource.resource.title)
        .sort((a, b) => (a.resource || a.linkDoc).title.toLowerCase() > (b.resource || b.linkDoc).title.toLowerCase() ? 1 : -1)
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
      return this.teamNotification(this.teamNotificationMessage(type, notificationParams), type, user, notificationParams);
    });
    return this.couchService.updateDocument('notifications/_bulk_docs', { docs: notifications });
  }

  teamNotificationMessage(type, { team, newMembersLength = '' }) {
    const user = this.userService.get();
    const fullName = user.firstName ? `${user.firstName} ${user.middleName} ${user.lastName}` : user.name;
    const truncatedFullName = truncateText(fullName, 22);
    const teamType = team.type || 'team';
    const teamMessage = team.type === 'services' ? 'the <b>Community Services Directory</b>' : `<b>"${truncateText(team.name, 22)}"</b> ${teamType}.`;
    switch (type) {
      case 'message':
        return $localize`<b>${truncatedFullName}</b> has posted a message on ${teamMessage}`;
      case 'request':
        return $localize`<b>${truncatedFullName}</b> has requested to join ${teamMessage}`;
      case 'added':
        return $localize`You have been added to ${teamMessage}`;
      case 'rejected':
        return $localize`You have not been accepted to ${teamMessage}`;
      case 'removed':
        return $localize`You have been removed from ${teamMessage}`;
      default:
        return $localize`${newMembersLength} member(s) has been added to ${teamMessage}`;
    }
  }

  teamNotification(message, type, user, { team, url }) {
    const link = url.split(';')[0];
    const userId = user.userId || user._id;
    const linkParams = type === 'request' ? { activeTab: 'applicantTab' } : {};
    return {
      'user': userId,
      message,
      link,
      linkParams,
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
        resourceId: resource.doc._id, sourcePlanet: resource.doc.sourcePlanet, title: resource.doc.title,
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

  createServicesDoc() {
    const { code, parentCode } = this.stateService.configuration;
    const newServicesDoc = {
      '_id': `${code}@${parentCode}`,
      'createdDate': this.couchService.datePlaceholder,
      'teamPlanetCode': `${code}`,
      'parentCode': `${parentCode}`,
      'description': '',
      'requests': [],
      'teamType': 'sync',
      'type': 'services'
    };
    return this.updateTeam(newServicesDoc);
  }

  teamLinkRoute(mode: 'team' | 'enterprise', teamId: string) {
    return `/${mode}s/view/${teamId}`;
  }

  createServicesLink({ title, route, teamType }) {
    const { code, parentCode } = this.stateService.configuration;
    const newServicesDoc = {
      'teamId': `${code}@${parentCode}`,
      'createdDate': this.couchService.datePlaceholder,
      'teamPlanetCode': `${code}`,
      'parentCode': `${parentCode}`,
      'docType': 'link',
      teamType,
      title,
      route
    };
    return this.updateTeam(newServicesDoc);
  }

  getTeamName(teamId: string): Observable<string> {
    return this.couchService.get(`${this.dbName}/${teamId}`).pipe(
      map((team: any) => {
        if (team && team.name) {
          if (team.type && team.type === 'enterprise') {
            return `Enterprise: ${team.name}`;
          } else {
            return `Team: ${team.name}`;
          }
        }
        return teamId;
      }),
    );
  }

  getTeamsByUser(userName: string, userPlanetCode: string) {
    const selector = {
      '$or': [
        { 'userId': `org.couchdb.user:${userName}` },
        { 'userId': `org.couchdb.user:${userName}@${userPlanetCode}` }
      ],
      'docType': 'membership'
    };
    return this.couchService.findAll('teams', findDocuments(selector)).pipe(
      switchMap(memberships => {
        const teamIds = memberships.map((doc: any) => doc.teamId);
        return this.couchService.findAll('teams', findDocuments({ '_id': { '$in': teamIds } }));
      }),
      map(teams => teams.filter((team: any) => team.status !== 'archived').map(team => ({ doc: team })))
    );
  }
}
