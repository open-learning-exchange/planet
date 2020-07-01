import { Directive, TemplateRef, ViewContainerRef, OnInit, Input } from '@angular/core';
import { UserService } from './user.service';

@Directive({
  selector: '[planetBeta]'
})
export class PlanetBetaDirective implements OnInit {

  constructor(
    private userService: UserService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  _planetBeta = true;
  @Input() set planetBeta(value: boolean) {
    this._planetBeta = value === null ? true : value;
  }

  ngOnInit() {
    if (this._planetBeta === this.isBetaEnabled()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  isBetaEnabled(): boolean {
    return this.userService.isBetaEnabled();
  }

}
