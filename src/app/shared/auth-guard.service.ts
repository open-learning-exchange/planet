import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { UserService } from './user.service';

import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class AuthService {
    
    constructor(private couchService: CouchService, private userService: UserService, private router: Router) {}

    private checkUser(): Promise<any> {
        return this.couchService
            .get('_session',{ withCredentials:true });
    }
    
    canActivate(route: ActivatedRouteSnapshot, state:RouterStateSnapshot): Promise<any> {
        return this.checkUser().then((res:any) => {
            if(res.userCtx.name) {
                this.userService.set(res.userCtx);
                return true;
            }
            this.router.navigate(['/login'], {queryParams: {returnUrl: state.url},replaceUrl:true});
            return false;
        });
    }
    
}