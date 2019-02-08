import { Directive, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { StateService } from './state.service';

@Directive({
  selector: '[planetBeta]'
})
export class PlanetBetaDirective implements OnInit {

  constructor(
    private stateService: StateService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  ngOnInit() {
    if (this.stateService.configuration.betaEnabled) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

}
