import { Injectable } from '@angular/core';

// Holds the currently logged in user information (object in userCtx property of response from a GET _session)
// User object = { 'name': <user name>, 'roles': [ <user roles...> ] }

@Injectable()
export class UserService {

    private user:any;
    
    set(user:any):any {
        this.user = user;
    }
    
    get():any {
        return this.user;
    }
    
    unset():any {
        this.user = {};
    }
    
}