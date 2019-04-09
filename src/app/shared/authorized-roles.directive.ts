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
    if (this.userService.doesUserHaveRole([ '_admin', ...authorizedRoles ])) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

}
