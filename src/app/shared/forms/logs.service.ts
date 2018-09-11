import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { UserService } from '../user.service';

@Injectable()
export class LogsService {

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  addLogs(data) {
    const log = {
      createdOn: this.userService.getConfig().code,
      parentDomain: this.userService.getConfig().parentDomain,
      createdTime: Date.now()
    };
    return this.couchService.post('activity_logs', { ...log, ...data });
  }

}
