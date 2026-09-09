import { Injectable } from '@angular/core';
import { of, empty, forkJoin, throwError } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { findDocuments, userPlanetCodeSelector } from '../shared/mangoQueries';
import { CustomValidators } from '../validators/custom-validators';
import { StateService } from '../shared/state.service';
import { ValidatorService } from '../validators/validator.service';
import { UsersService } from '../users/users.service';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { fullName, truncateText } from '../shared/utils';
import { memberCompare, memberIdentity } from './teams.utils';
import { userIdentity, userIdentityCandidates } from '../shared/identity.utils';
import { notificationRecipient } from '../notifications/notifications.service';

const nameField = {
  type: 'textbox',
  name: 'name',
  placeholder: $localize`Name`,
  required: true
};
const descriptionField = {
  type: 'markdown',
  name: 'description',
  placeholder: $localize`What is your team\'s plan?`,
  required: false
};
const enterpriseDescField = [
  {
    type: 'markdown',
    name: 'description',
    placeholder: $localize`What is your enterprise\'s Mission?`,
    required: false
  }, {
    type: 'markdown',
    name: 'services',
    placeholder: $localize`What are the Services your enterprise provides?`,
    required: false
  }, {
    type: 'markdown',
    name: 'rules',
    placeholder: $localize`What are the Rules of your enterprise?`,
    required: false
  }
];
const publicField = {
  type: 'toggle',
  name: 'public',
  label: $localize`Public`
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

  addTeamDialog(user: any, type: 'team' | 'enterprise' | 'services', team: any = {}) {
    const configuration = this.stateService.configuration;
    const creatorIdentity = userIdentity(user, configuration.code);
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
          this.updateTeam({
            limit: 12,
            status: 'active',
            createdDate: this.couchService.datePlaceholder,
            teamPlanetCode: configuration.code,
            parentCode: configuration.parentCode,
            ...(!team._id ? {
              createdBy: creatorIdentity.userId,
              createdByPlanetCode: creatorIdentity.userPlanetCode
            } : {}),
            ...team,
            ...response,
            type
          }) :
          empty()
        ),
        switchMap((response) => !team._id ?
          this.toggleTeamMembership(response, false, { ...creatorIdentity, isLeader: true }) :
          of(response)
        )
      );
  }

  addTeamFields(configuration, type) {
    const typeField = {
      type: 'selectbox',
      name: 'teamType',
      placeholder: $localize`Team Type`,
      options: [
        {
          value: 'sync',
          name: configuration.planetType === 'community' ? $localize`Connect with nation` : $localize`Connect with earth`
        },
        { value: 'local', name: $localize`Local team` }
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
    return this.couchService.updateDocument(this.dbName, team).pipe(switchMap((res: any) => of({ ...team, _rev: res.rev, _id: res.id })));
  }

  requestToJoinTeam(team, user) {
    const identity = userIdentity(user, this.stateService.configuration.code);
    return this.couchService.updateDocument(this.dbName, {
      createdDate: this.couchService.datePlaceholder,
      ...this.membershipProps(team, identity, 'request')
    }).pipe(
      switchMap(() => team.teamType === 'sync' ? this.userService.addImageForReplication(true, [ user ]) : of({}))
    );
  }

  removeFromRequests(team, memberInfo) {
    const identity = memberIdentity(memberInfo, team);
    return this.removeRequestsForIdentities(team, [ identity ]);
  }

  private removeRequestsForIdentities(team, identities, requireMatch = false) {
    const validIdentities = identities.filter(identity => identity?.userId);
    if (validIdentities.length === 0) {
      return throwError(new Error('Request user ID is required.'));
    }
    const userIds = [ ...new Set(validIdentities.map(identity => identity.userId)) ];
    return this.couchService.findAll(this.dbName, findDocuments({
      teamId: team._id,
      docType: 'request',
      userId: userIds.length === 1 ? userIds[0] : { $in: userIds },
      ...userPlanetCodeSelector(...validIdentities.map(identity => identity.userPlanetCode))
    })).pipe(
      map((docs: any[]) => docs.filter(doc => validIdentities.some(identity =>
        memberCompare(doc, identity, team.teamPlanetCode)
      ))),
      switchMap((docs: any[]) => docs.length === 0 ?
        requireMatch ? throwError(new Error('Join request not found.')) : of([]) :
        this.couchService.bulkDocs(this.dbName, docs.map(doc => ({ ...doc, _deleted: true })))
      )
    );
  }

  cancelJoinRequest(team) {
    const user = this.userService.get();
    return this.removeRequestsForIdentities(
      team,
      userIdentityCandidates(user, this.stateService.configuration.code),
      true
    );
  }

  toggleTeamMembership(team, leaveTeam, memberInfo) {
    return this.updateMembershipDoc(team, leaveTeam, memberInfo).pipe(
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
    if (!memberInfo?.userId) {
      return throwError(new Error('Membership user ID is required.'));
    }
    const deleted = leaveTeam ? { _deleted: true } : {};
    const isExistingEdit = !leaveTeam && memberInfo.docType !== 'request' && Boolean(memberInfo._id || memberInfo._rev);
    const persistedMemberInfo = { ...memberInfo };
    delete persistedMemberInfo._id;
    delete persistedMemberInfo._rev;
    delete persistedMemberInfo.docType;
    const membershipProps = this.membershipProps(team, persistedMemberInfo, 'membership');
    const identity = memberIdentity(memberInfo, team);
    const lookupSelector = {
      teamId: team._id,
      docType: 'membership',
      userId: persistedMemberInfo.userId,
      ...userPlanetCodeSelector(identity.userPlanetCode)
    };
    return this.couchService.findAll(this.dbName, findDocuments(lookupSelector)).pipe(
      map((docs: any[]) => docs
        .filter(doc => memberCompare(doc, identity, team.teamPlanetCode))
        .filter(doc => !isExistingEdit || doc._id === memberInfo._id)
      ),
      switchMap((docs: any[]) => {
        if ((leaveTeam || isExistingEdit) && docs.length === 0) {
          return throwError(new Error('Membership document not found.'));
        }
        if (!leaveTeam && !isExistingEdit && docs.length > 0) {
          return of({});
        }
        const membershipDocs = docs.length === 0 ? [ membershipProps ] : docs;
        return this.writeMembershipDocs(membershipDocs.map(membershipDoc => this.membershipWriteDoc(
          {
            ...membershipDoc,
            ...persistedMemberInfo,
            ...membershipProps,
            ...(membershipProps.userPlanetCode === undefined && membershipDoc.userPlanetCode !== undefined ?
              { userPlanetCode: membershipDoc.userPlanetCode } : {}),
            ...(membershipDoc._rev ? { _id: membershipDoc._id, _rev: membershipDoc._rev } : {})
          },
          deleted
        )));
      })
    );
  }

  addMembers(team, selected, requests) {
    const selectedIdentityCandidates = selected.map(user => userIdentityCandidates(
      user, team.teamPlanetCode || this.stateService.configuration.code
    ));
    if (selectedIdentityCandidates.some(identities => identities.length === 0)) {
      return throwError(new Error('Membership user ID is required.'));
    }
    const selectedIdentities = selectedIdentityCandidates.map(identities => identities[0]);
    const newMembershipDocs = selectedIdentities.map(identity =>
      this.membershipProps(team, identity, 'membership')
    );
    const requestsToDelete = requests.filter(request => selectedIdentityCandidates.some(identities =>
      identities.some(identity => memberCompare(request, identity, team.teamPlanetCode))
    ))
      .map(({ _id, _rev }) => ({ _id, _rev, _deleted: true }));
    return this.writeMembershipDocs([ ...newMembershipDocs, ...requestsToDelete ], newMembershipDocs.length);
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
    const shouldDemoteOldLeader = Boolean(oldLeader?._id) && oldLeader._id !== newLeader?._id;
    return this.freshMembershipDoc(newLeader).pipe(
      switchMap(freshNewLeader => this.writeMembershipDocs([
        this.membershipWriteDoc(freshNewLeader, { isLeader: true })
      ])),
      switchMap(promotionResponse => shouldDemoteOldLeader ?
        this.freshMembershipDoc(oldLeader, false).pipe(
          switchMap(freshOldLeader => this.writeMembershipDocs([
            this.membershipWriteDoc(freshOldLeader, { isLeader: false })
          ])),
          map(() => promotionResponse)
        ) : of(promotionResponse)
      )
    );
  }

  // Membership documents contain exactly this persisted schema; other member fields are enriched view data.
  private membershipWriteDoc(member, overrides: any = {}) {
    const {
      _id,
      _rev,
      createdDate,
      updatedDate,
      teamId,
      teamPlanetCode,
      teamType,
      userId,
      userPlanetCode,
      docType,
      isLeader,
      role,
      _deleted
    } = { ...member, ...overrides };
    return {
      ...(_id ? { _id } : {}),
      ...(_rev ? { _rev } : {}),
      ...(createdDate !== undefined ? { createdDate } : {}),
      ...(updatedDate !== undefined ? { updatedDate } : {}),
      teamId,
      teamPlanetCode,
      teamType,
      userId,
      userPlanetCode,
      docType: docType || 'membership',
      ...(isLeader !== undefined ? { isLeader } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(_deleted === true ? { _deleted: true } : {})
    };
  }

  private writeMembershipDocs(docs: any[], requiredResultCount = docs.length) {
    return this.couchService.bulkDocs(this.dbName, docs).pipe(
      switchMap(response => this.validateBulkDocsResponse(response, docs.length, requiredResultCount))
    );
  }

  private freshMembershipDoc(member, requireUserId = true) {
    if (requireUserId && !member?.userId) {
      return throwError(new Error('Membership user ID is required.'));
    }
    if (!member?._id && !member?.userId) {
      return throwError(new Error('Membership document identity is required.'));
    }
    return member?._id ?
      this.couchService.get(`${this.dbName}/${member._id}`).pipe(map(doc => ({ ...member, ...doc }))) :
      of(member);
  }

  private validateBulkDocsResponse(response: any, expectedCount: number, requiredResultCount = expectedCount) {
    const results = Array.isArray(response) ? response : response?.res;
    if (!Array.isArray(results)) {
      return throwError(new Error('Unexpected bulk document response.'));
    }
    const requiredResults = results.slice(0, requiredResultCount);
    const error = requiredResults.find(result => result?.error);
    if (error) {
      return throwError(error);
    }
    const hasUnexpectedResult = requiredResultCount > expectedCount || requiredResults.length !== requiredResultCount ||
      (requiredResultCount === expectedCount && results.length !== expectedCount) || requiredResults.some(result =>
      typeof result?.id !== 'string' || result.id.length === 0 ||
      typeof result?.rev !== 'string' || result.rev.length === 0
    );
    return hasUnexpectedResult ? throwError(new Error('Unexpected bulk document response.')) : of(response);
  }

  membershipProps(team, memberInfo, docType) {
    const { userId, userPlanetCode, isLeader } = memberInfo;
    const { _id: teamId, teamPlanetCode, teamType } = team;
    return {
      teamId,
      userId,
      teamPlanetCode,
      teamType,
      ...(userPlanetCode !== undefined ? { userPlanetCode } : {}),
      docType,
      ...(isLeader !== undefined ? { isLeader } : {})
    };
  }

  getTeamMembers(team, withAllLinks = false) {
    const selector = {
      teamId: team._id,
      teamPlanetCode: team.teamPlanetCode,
      status: { $or: [ { $exists: false }, { $ne: 'archived' } ] },
      ...(withAllLinks ? {} : { docType: 'membership' })
    };
    this.usersService.requestUserData();
    return forkJoin([
      this.couchService.findAll(this.dbName, findDocuments(selector)),
      this.usersService.usersListener(true).pipe(take(1)),
      this.couchService.findAll('attachments')
    ]).pipe(map(([ membershipDocs, users, attachments ]: any[]) => {
      const usersByIdentity = new Map<string, any>();
      users.forEach(user => userIdentityCandidates(user, this.stateService.configuration.code).forEach(identity => {
        const key = `${identity.userId}\u0000${identity.userPlanetCode || ''}`;
        if (!usersByIdentity.has(key)) {
          usersByIdentity.set(key, user);
        }
      }));
      const attachmentsById = new Map(attachments.map(attachment => [ attachment._id, attachment ]));
      return membershipDocs.map(doc => {
        if (doc.docType !== 'membership' && doc.docType !== 'request') {
          return doc;
        }
        const identity = memberIdentity(doc, team);
        const userDoc = usersByIdentity.get(`${identity.userId}\u0000${identity.userPlanetCode || ''}`);
        const userSource = userDoc?.doc || userDoc;
        const attachmentUserId = userSource?._id || userDoc?._id || identity.userId;
        const attachmentPlanetCode = userSource?.planetCode || identity.userPlanetCode;
        return {
          ...doc,
          resolvedUserPlanetCode: identity.userPlanetCode,
          userDoc,
          attachmentDoc: attachmentsById.get(`${attachmentUserId}@${attachmentPlanetCode}`)
        };
      });
    }));
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
    const currentUser = notificationRecipient(
      this.userService.get(), notificationParams.team.teamPlanetCode
    );
    const notifications = members.filter((user: any) => {
      const recipient = notificationRecipient(user, notificationParams.team.teamPlanetCode);
      return (currentUser.user !== recipient.user || currentUser.userPlanetCode !== recipient.userPlanetCode) &&
        user.name !== 'satellite';
    }).map((user: any) => this.teamNotification(this.teamNotificationMessage(type, notificationParams), type, user, notificationParams));
    return this.couchService.updateDocument('notifications/_bulk_docs', { docs: notifications });
  }

  teamNotificationMessage(type, { team, newMembersLength = '' }) {
    const user = this.userService.get();
    const memberName = fullName(user) || user.name;
    const truncatedFullName = truncateText(memberName, 22);
    const teamType = team.type || 'team';
    const teamMessage = team.type === 'services' ?
      'the <b>Community Services Directory</b>' :
      `<b>"${truncateText(team.name, 22)}"</b> ${teamType}.`;
    let message;
    switch (type) {
      case 'message':
        message = $localize`<b>${truncatedFullName}</b> has posted a message on ${teamMessage}`;
        break;
      case 'request':
        message = $localize`<b>${truncatedFullName}</b> has requested to join ${teamMessage}`;
        break;
      case 'added':
        message = $localize`You have been added to ${teamMessage}`;
        break;
      case 'rejected':
        message = $localize`You have not been accepted to ${teamMessage}`;
        break;
      case 'removed':
        message = $localize`You have been removed from ${teamMessage}`;
        break;
      default:
        message = $localize`${newMembersLength} member(s) has been added to ${teamMessage}`;
    }
    return message;
  }

  teamNotification(message, type, user, { team, url }) {
    const link = url.split(';')[0];
    const linkParams = type === 'request' ? { activeTab: 'applicantTab' } : {};
    return {
      ...notificationRecipient(user, team.teamPlanetCode),
      message,
      link,
      linkParams,
      item: team._id,
      type: 'team',
      priority: 1,
      status: 'unread',
      time: this.couchService.datePlaceholder
    };
  }

  teamActivity(team: any, activity = 'teamVisit') {
    const data = {
      teamId: team._id,
      title: team.title,
      user: this.userService.get().name,
      type: activity,
      teamType: team.teamType,
      teamPlanetCode: team.teamPlanetCode,
      time: this.couchService.datePlaceholder,
      createdOn: this.stateService.configuration.code,
      parentCode: this.stateService.configuration.parentCode
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
      _id: `${code}@${parentCode}`,
      createdDate: this.couchService.datePlaceholder,
      teamPlanetCode: `${code}`,
      parentCode: `${parentCode}`,
      description: '',
      requests: [],
      teamType: 'sync',
      type: 'services'
    };
    return this.updateTeam(newServicesDoc);
  }

  teamLinkRoute(mode: 'team' | 'enterprise', teamId: string) {
    return `/${mode}s/view/${teamId}`;
  }

  createServicesLink({ title, route, teamType, icon }) {
    const { code, parentCode } = this.stateService.configuration;
    const newServicesDoc = {
      teamId: `${code}@${parentCode}`,
      createdDate: this.couchService.datePlaceholder,
      teamPlanetCode: `${code}`,
      parentCode: `${parentCode}`,
      docType: 'link',
      teamType,
      icon,
      title,
      route
    };
    return this.updateTeam(newServicesDoc);
  }

  getTeamsByUser(userName: string, userPlanetCode: string) {
    const selector = {
      $or: [
        { userId: `org.couchdb.user:${userName}` },
        { userId: `org.couchdb.user:${userName}@${userPlanetCode}` }
      ],
      docType: 'membership'
    };
    return this.couchService.findAll('teams', findDocuments(selector)).pipe(
      switchMap(memberships => {
        const teamIds = memberships.map((doc: any) => doc.teamId);
        return this.couchService.findAll('teams', findDocuments({ _id: { $in: teamIds } }));
      }),
      map(teams => teams.filter((team: any) => team.status !== 'archived').map(team => ({ doc: team })))
    );
  }
}
