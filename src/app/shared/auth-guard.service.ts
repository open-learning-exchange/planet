import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { UserService } from './user.service';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class AuthService {

  constructor(private couchService: CouchService, private userService: UserService, private router: Router) {}

  private checkUser(url: any): Observable<boolean> {
    return this.couchService
      .get('_session', { withCredentials: true })
      .pipe(map((res: any) => {
        if (res.userCtx.roles.indexOf('_admin') > -1) {
          console.log('Admin');
        } else {
          this.getProfile(res.userCtx.name);
        }
        if (res.userCtx.name) {
          this.userService.set(res.userCtx);
          return true;
        }
        this.router.navigate([ '/login' ], { queryParams: { returnUrl: url }, replaceUrl: true });
        return false;
      }));
  }

  getProfile(username) {
    this.couchService.get('_users/org.couchdb.user:' + username)
      .subscribe((data) => {
        if (data.firstName) { // that means profile has been set
          const profile = {
            'admin': data.admin,
            'birthDate': data.birthDate,
            'email': data.email,
            'name' : data.name,
            'firstName': data.firstName,
            'middleName': data.middleName,
            'lastName': data.lastName,
            'gender': data.gender,
            'language': data.language,
            'level': data.level,
            'phoneNumber': data.phoneNumber,
            'roles': data.roles,
            'type': data.type
          };
          this.userService.setProfile(profile);
        }
      }, (error) => console.log(error));
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkUser(state.url);
  }

}
