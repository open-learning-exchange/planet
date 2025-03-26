import { Directive, Input, OnInit, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { UserService } from './user.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive({
  selector: '[planetAuthorizedRoles]'
})
export class AuthorizedRolesDirective implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<void>();
  private rolesString: string;
  private isLoggedOut = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((user) => {
        this.isLoggedOut = user?._id === undefined;
        this.checkRoles();
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  @Input()
  set planetAuthorizedRoles(rolesString: string) {
    this.rolesString = rolesString;
    this.checkRoles();
  }

  checkRoles() {
    if (this.isLoggedOut) {
      return;
    }
    const authorizedRoles = (this.rolesString || '').split(',').map(val => val.trim());
    const allowedAdmins = authorizedRoles[0] === 'only' ? [] : [ '_admin', 'manager' ];
    if (this.rolesString === '_any' || this.userService.doesUserHaveRole([ ...allowedAdmins, ...authorizedRoles ])) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

}
