import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { Observable } from 'rxjs/Observable';

import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class RoleService {

  constructor(private couchService: CouchService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    this.couchService
    .get(this.getUrlDetails(state.url).stateDetails)
    .subscribe(data => {
      return true;
    }, (error) => {
      this.router.navigate([ this.getUrlDetails(state.url).navigateDetails ]);
      return false;
    });
    return true;
  }

  getUrlDetails(state: string) {
    if (state === '/resources/add') {
      urldetails.stateDetails = 'resources/_all_docs?include_docs=true';
      urldetails.navigateDetails = '/resources';
      return urldetails;
    }
    if (state === '/courses/add') {
      urldetails.stateDetails = 'courses/_all_docs?include_docs=true';
      urldetails.navigateDetails = '/courses';
      return urldetails;
    }
    if (state === '/meetups/add') {
      urldetails.stateDetails = 'meetups/_all_docs?include_docs=true';
      urldetails.navigateDetails = '/meetups';
      return urldetails;
    }
  }

}

const urldetails = {
  stateDetails: '' ,
  navigateDetails: ''
};
