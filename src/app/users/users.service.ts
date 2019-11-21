import { Injectable } from '@angular/core';
import { forkJoin, Subject, zip, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private dbName = '_users';
  usersUpdated = new Subject<any>();
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  data: { users: any[], loginActivities: any[], childUsers: any[] } = { users: [], loginActivities: [], childUsers: [] };
  // List of all possible roles to add to users
  roleList: { value: string, text: string }[] = [
    ...[ { value: 'leader', text: 'Leader' }, { value: 'monitor', text: 'Monitor' } ],
    ...[ this.userService.isBetaEnabled ? [ { value: 'health', text: 'Health Provider' } ] : [] ].flat()
  ];
  allRolesList: { value: string, text: string }[] = [
    ...this.roleList, { value: 'learner', text: 'Learner' }, { value: 'manager', text: 'Manager' }
  ].sort();

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService,
    private tasksService: TasksService
  ) {
    const checkIfLocal = (current, data: { newData, planetField }) => data && data.planetField === 'local' ? data.newData : current;
    combineLatest([
      this.stateService.couchStateListener(this.dbName),
      this.stateService.couchStateListener('login_activities'),
      this.stateService.couchStateListener('child_users')
    ]).subscribe(([ users, loginActivities, childUsers ]) => {
      this.data = {
        users: checkIfLocal(this.data.users, users),
        loginActivities: checkIfLocal(this.data.loginActivities, loginActivities),
        childUsers: checkIfLocal(this.data.childUsers, childUsers)
      };
      this.usersUpdated.next(
        this.data.users.filter((user: any) => {
          // Removes current user and special satellite user from list.  Users should not be able to change their own roles,
          // so this protects from that.  May need to unhide in the future.
          return this.userService.get().name !== user.name && user.name !== 'satellite';
        }).concat(this.data.childUsers).map((user: any) => this.fullUserDoc(user))
      );
    });
  }

  getAllUsers(withPrivateDocs = false) {
    return this.couchService.findAll(this.dbName).pipe(map(users => withPrivateDocs ?
      users :
      users.map(user => this.userService.getUserProperties(user))
    ));
  }

  requestUsers() {
    this.stateService.requestData(this.dbName, 'local');
    this.stateService.requestData('login_activities', 'local');
    this.stateService.requestData('child_users', 'local');
  }

  fullUserDoc(user: any) {
    const userInfo = {
      _id: user._id,
      doc: user,
      imageSrc: '',
      fullName: user.firstName + ' ' + user.lastName,
      visitCount: this.userLoginCount(user, this.data.loginActivities),
      lastLogin: this.userLastLogin(user, this.data.loginActivities),
      roles: this.toProperRoles(user.roles)
    };
    if (user._attachments) {
      userInfo.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
    }
    return userInfo;
  }

  toggleAdminStatus(user) {
    return user.roles.length === 0 ? this.demoteFromAdmin(user) : this.promoteToAdmin(user);
  }

  demoteFromAdmin(user) {
    const planetConfig = this.stateService.configuration;
    const parentUserId = `org.couchdb.user:${user.name}@${planetConfig.code}`;
    return this.couchService.findAll(
      this.dbName,
      { selector: { _id: parentUserId } },
      { domain: planetConfig.parentDomain }
    ).pipe(switchMap(([ parentUser ]: any[]) =>
      forkJoin([
        this.couchService.delete('_node/nonode@nohost/_config/admins/' + user.name),
        // TODO: When changing to a sync strategy for updating parent uncomment next line
        // this.couchService.delete(`_users/${parentUserId}${parentUser ? `?rev=${parentUser._rev}` : ''}`),
        this.setRoles({ ...user, isUserAdmin: false }, user.oldRoles)
      ])
    ));
  }

  promoteToAdmin(user) {
    const planetConfig = this.stateService.configuration;
    const adminName = user.name + '@' + planetConfig.code;
    const adminId = `org.couchdb.user:${adminName}`;
    const parentUser = {
      ...user,
      requestId: planetConfig._id,
      isUserAdmin: false,
      roles: [],
      name: adminName,
      sync: true,
      _attachments: undefined,
      _rev: undefined
    };
    return forkJoin([
      this.couchService.updateDocument(this.dbName, { ...parentUser, '_id': adminId }, { domain: planetConfig.parentDomain }),
      this.couchService.put(
        `_node/nonode@nohost/_config/admins/${user.name}`,
        `-${user.password_scheme}-${user.derived_key},${user.salt},${user.iterations}`
      ),
      this.setRoles({ ...user, isUserAdmin: true }, []),
      this.removeFromTabletUsers(user)
    ]);
  }

  toggleManagerStatus(user) {
    return forkJoin([
      this.setRoles({ ...user, isUserAdmin: !user.isUserAdmin }, user.isUserAdmin ? user.oldRoles : [ 'manager' ]),
      user.isUserAdmin ? of({}) : this.removeFromTabletUsers(user)
    ]);
  }

  setRoles(user, roles) {
    const tempUser = {
      ...user,
      roles: roles,
      oldRoles: [ ...user.roles ] || [ 'learner' ],
    };
    return this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser);
  }

  removeFromTabletUsers(user) {
    return this.couchService.delete('tablet_users/' + user._id + '?rev=' + user._rev);
  }

  userLoginCount(user: any, loginActivities: any[]) {
    return loginActivities.filter((logItem: any) => logItem.user === user.name).length;
  }

  userLastLogin(user: any, loginActivities: any[]) {
    return loginActivities.filter((logItem: any) => logItem.user === user.name)
      .reduce((max: number, log: any) => log.loginTime > max ? log.loginTime : max, '');
  }

  toProperRoles(roles) {
    return roles.map(role => this.allRolesList.find(roleObj => roleObj.value === role).text);
  }

  deleteUser(user) {
    const userId = 'org.couchdb.user:' + user.name;
    return this.couchService.get('shelf/' + userId).pipe(
      switchMap(shelfUser => {
        return forkJoin([
          this.couchService.delete('_users/' + userId + '?rev=' + user._rev),
          this.couchService.delete('shelf/' + userId + '?rev=' + shelfUser._rev),
          this.deleteUserFromTeams(user),
          this.tasksService.removeAssigneeFromTasks(user._id)
        ]);
      }),
      map(() => this.requestUsers())
    );
  }

  deleteUserFromTeams(user) {
    return this.couchService.findAll('teams', { selector: { userId: user._id } }).pipe(
      switchMap(teams => {
        const docsWithUser = teams.map(doc => ({ ...doc, _deleted: true }));
        return this.couchService.bulkDocs('teams', docsWithUser);
      })
    );
  }

  setRolesForUsers(users: any[], roles: string[]) {
    const newRoles = [ 'learner', ...roles ];
    return forkJoin(users.reduce((observers, user) => {
      // Do not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds
        const tempUser = { ...user, roles: newRoles };
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, [])).pipe(map((responses) => this.stateService.requestData(this.dbName, 'local')));
  }

}
