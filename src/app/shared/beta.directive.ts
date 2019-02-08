import { Directive, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { StateService } from './state.service';
import { UserService } from './user.service';

@Directive({
  selector: '[planetBeta]'
})
export class PlanetBetaDirective implements OnInit {

  constructor(
    private stateService: StateService,
    private userService: UserService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  ngOnInit() {
    if (this.userService.get().betaEnabled) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

}
