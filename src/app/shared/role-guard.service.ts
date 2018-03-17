import { Injectable } from '@angular/core';
import { UserService } from './user.service';

@Injectable()
export class RoleService {

  constructor(private userService: UserService) {}

  isHaveARoleAndIsAdmin() {
    if (this.userService.get().roles.length > 0  || this.userService.get().isUserAdmin) {
      return true;
    }
    return false;
  }

}
