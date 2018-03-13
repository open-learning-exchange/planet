import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { UserService } from './user.service';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class RoleService {

  constructor(private couchService: CouchService, private userService: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    if (route.url.toString() === 'add') {
      if (this.userService.get().roles.length !== 0 || this.userService.get().isUserAdmin) {
        return true;
      }
      this.router.navigate([ '' ]);
      return false;
    }
  }
}
