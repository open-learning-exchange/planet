import { Directive, TemplateRef, ViewContainerRef, OnInit, Input } from '@angular/core';
import { UserService } from './user.service';

@Directive({ selector: '[planetBeta]' })
export class PlanetBetaDirective implements OnInit {

  #planetBeta = true;

  constructor(
    private userService: UserService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  @Input() set planetBeta(value: boolean) {
    this.#planetBeta = value === null ? true : value;
  }

  ngOnInit() {
    if (this.#planetBeta === this.isBetaEnabled()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  isBetaEnabled(): boolean {
    return this.userService.isBetaEnabled();
  }

}
