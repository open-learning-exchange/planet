import { Injectable } from '@angular/core';
import { forkJoin, Subject, combineLatest, of, throwError } from 'rxjs';
import { switchMap, map, catchError, filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { TasksService } from '../tasks/tasks.service';
import { findDocuments } from '../shared/mangoQueries';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private dbName = '_users';
  private adminConfig = '_node/nonode@nohost/_config/admins/';
  usersUpdated = new Subject<any>();
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  data: { users: any[], loginActivities: any[], childUsers: any[], parentUsers: any[] } = {
    users: [], loginActivities: [], childUsers: [], parentUsers: []
  };
  // List of all possible roles to add to users
  roleList: string[] = [ 'leader', 'monitor', 'health' ];
  allRolesList: string[] = [ ...this.roleList, 'learner', 'manager', 'admin' ].sort();

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService,
    private tasksService: TasksService
  ) {
    const checkIfLocal = (data: { newData, planetField, db }) => data && data.planetField === 'local';
    const dataToUse = (oldData, data: { newData, planetField, db }, isLocal) => isLocal ? data.newData : oldData;
    combineLatest([
      this.stateService.couchStateListener('child_users'),
      this.stateService.couchStateListener('parent_users').pipe(filter((parentUsers) => checkIfLocal(parentUsers)))
    ]).pipe(
      switchMap(([ childUsers, parentUsers ]) => {
        const childLocal = checkIfLocal(childUsers);
        return !childLocal ? of([ [], { rows: [] } ]) : forkJoin([
          this.couchService.findAll(this.dbName),
          this.couchService.get(`login_activities/_design/login_activities/_view/byUser?group=true`),
          of(dataToUse(this.data.childUsers, childUsers, childLocal)),
          of(parentUsers.newData)
        ]);
      })
    ).subscribe(([ users, { rows: loginActivities }, childUsers, parentUsers ]: [ any[], { rows: any[] }, any[], any[] ]) => {
      if (childUsers === undefined) {
        return;
      }
      this.data = { users, loginActivities, childUsers, parentUsers };
      this.updateUsers();
    });
  }

  getAllUsers(withPrivateDocs = false) {
    return this.couchService.findAll(this.dbName).pipe(map(users => withPrivateDocs ?
      users :
      users.map(user => this.userService.getUserProperties(user))
    ));
  }

  requestUsers(withPrivateDocs = false) {
    this.getAllUsers(withPrivateDocs).subscribe(users => {
      this.data.users = users;
      this.updateUsers();
    });
  }

  usersListener(includeSelf = false) {
    // Option to remove current user from list. Users should not be able to change their own roles so this protects from that.
    return this.usersUpdated.pipe(map(users => users.filter(user => includeSelf || this.userService.get().name !== user.doc.name)));
  }

  updateUsers() {
    this.usersUpdated.next(
      [
        ...this.data.users.filter((user: any) => user.name !== 'satellite'),
        ...this.data.childUsers,
        ...this.data.parentUsers
      ].map((user: any) => this.fullUserDoc(user))
    );
  }

  // Triggers state service for 'child_users' DB.  After that completes fetches '_users' and 'login_activities' data (see constructor).
  requestUserData() {
    this.stateService.requestData('child_users', 'local');
    this.stateService.requestData('parent_users', 'local');
  }

  fullUserDoc(user: any) {
    const userInfo = {
      _id: user._id,
      doc: user,
      imageSrc: '',
      fullName: (user.firstName || user.lastName) ? `${user.firstName} ${user.middleName} ${user.lastName}` : user.name,
      ...this.userLoginActivities(user, this.data.loginActivities)
    };
    if (user._attachments) {
      userInfo.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
    }
    return userInfo;
  }

  toggleAdminStatus(user) {
    return user.roles.length === 0 ? this.demoteFromAdmin(user) : this.promoteToAdmin(user);
  }

  demoteFromAdmin(userDoc) {
    const { adminName, ...user } = userDoc;
    const planetConfig = this.stateService.configuration;
    const parentUserId = `org.couchdb.user:${adminName}`;
    return this.couchService.findAll(
      this.dbName,
      { selector: { _id: parentUserId } },
      { domain: planetConfig.parentDomain }
    ).pipe(switchMap(([ parentUser ]: any[]) =>
      forkJoin([
        this.couchService.delete(`${this.adminConfig}${user.name}`),
        // TODO: When changing to a sync strategy for updating parent uncomment next line
        // this.couchService.delete(`_users/${parentUserId}${parentUser ? `?rev=${parentUser._rev}` : ''}`),
        this.setRoles({ ...user, isUserAdmin: false }, user.oldRoles)
      ])
    ));
  }

  promoteToAdmin(user) {
    const { name, password_scheme, derived_key, salt, iterations } = user;
    const { code, _id: requestId, parentDomain: domain } = this.stateService.configuration;
    const adminName = name + '@' + code + '@' + Date.now();
    const adminId = `org.couchdb.user:${adminName}`;
    const parentUser = {
      ...user,
      _id: adminId,
      requestId,
      isUserAdmin: false,
      roles: [ 'learner' ],
      name: adminName,
      sync: true,
      _attachments: undefined,
      _rev: undefined
    };
    return this.couchService.get(this.dbName + '/' + adminId, { domain }).pipe(
      catchError(() => of(null)),
      switchMap(oldDoc => forkJoin([
        oldDoc ? of({}) : this.couchService.updateDocument(this.dbName, parentUser, { domain, withCredentials: false }),
        this.couchService.put(`${this.adminConfig}${name}`, `-${password_scheme}-${derived_key},${salt},${iterations}`),
        this.setRoles({ ...user, isUserAdmin: true, adminName }, []),
        this.removeFromTabletUsers(user)
      ]))
    );
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
    return this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).pipe(
      switchMap(() => this.sendNotifications(user))
    );
  }

  removeFromTabletUsers(user) {
    return this.couchService.delete('tablet_users/' + user._id + '?rev=' + user._rev).pipe(catchError((error) =>
      error.status === 404 ? of({}) : throwError(error)
    ));
  }

  userLoginActivities(user: any, loginActivities: any[]) {
    const loginActivity = loginActivities.find(
      ({ key: activity }: any) => activity.user === user.name && activity.createdOn === user.planetCode
    ) || { value: { count: 0 } };
    return { visitCount: loginActivity.value.count, lastLogin: loginActivity.value.max };
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
      map(() => this.requestUsers(true))
    );
  }

  deleteUserFromTeams(user) {
    return this.couchService.findAll('teams', { selector: { userId: user._id } }).pipe(
      switchMap(teams => {
        const docsWithUser = teams.map((doc: any) => ({ ...doc, _deleted: true }));
        return this.couchService.bulkDocs('teams', docsWithUser);
      })
    );
  }

  setRolesForUsers(users: any[], roles: string[]) {
    const newRoles = [ 'learner', ...roles ];
    return forkJoin(users.reduce((observers, user) => {
      // Do not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        observers.push(this.setRoles(user, newRoles));
      }
      return observers;
    }, [])).pipe(map((responses) => this.requestUsers(true)));
  }

  sendNotifications(user) {
    const notificationDoc = {
      user: user._id,
      'message': $localize`You were assigned a new role`,
      link: '/myDashboard',
      'type': 'newRole',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
      userPlanetCode: user.userPlanetCode
    };
    return this.couchService.findAll(
      'notifications/_find',
      findDocuments({ 'user': user._id, 'status': 'unread', 'type': 'newRole' })
    ).pipe(
      switchMap((res: any[]) => res.length === 0 ? this.couchService.updateDocument('notifications', notificationDoc) : of({}))
    );
  }

}
