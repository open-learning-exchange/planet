import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { UserService } from './user.service';

@Directive({
  selector: '[planetAuthorizedRoles]'
})
export class AuthorizedRolesDirective {

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private userService: UserService
  ) {}

  @Input()
  set planetAuthorizedRoles(rolesString: string) {
    const authorizedRoles = (rolesString || '').split(',').map(val => val.trim());
    const userRoles = this.userService.get().roles;
    const authorized = userRoles.findIndex(userRole => this.isRoleAuthorized(userRole, authorizedRoles)) > -1;
    if (authorized) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  isRoleAuthorized(userRole, authorizedRoles) {
    return userRole === '_admin' || authorizedRoles.findIndex(authorizedRole => authorizedRole === userRole) > -1;
  }

}
