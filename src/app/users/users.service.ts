import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { StateService } from '../shared/state.service';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  demoteFromAdmin(user) {
    const planetConfig = this.stateService.configuration;
    const parentUserId = `org.couchdb.user:${user.name}@${planetConfig.parentCode}`;
    return this.couchService.findAll('_users', { selector: { _id: parentUserId } }).pipe(switchMap(([ parentUser ]: any[]) =>
      forkJoin([
        this.couchService.delete('_node/nonode@nohost/_config/admins/' + user.name),
        this.couchService.delete(`_users/${parentUserId}${parentUser ? `?rev=${parentUser._rev}` : ''}`),
        this.setRoles({ ...user, isUserAdmin: false }, user.oldRoles)
      ])
    ));
  }

  promoteToAdmin(user) {
    const planetConfig = this.stateService.configuration;
    const adminName = user.name + '@' + planetConfig.parentCode;
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
      this.couchService.updateDocument('_users', { ...parentUser, '_id': adminId }),
      this.couchService.put(
        `_node/nonode@nohost/_config/admins/${user.name}`,
        `-${user.password_scheme}-${user.derived_key},${user.salt},${user.iterations}`
      ),
      this.setRoles({ ...user, isUserAdmin: true }, []),
      this.removeFromTabletUsers(user)
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

}
