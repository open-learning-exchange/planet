import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { ManagerService } from '../../manager-dashboard/manager.service';
import { StateService } from '../state.service';
import { attachNamesToPlanets } from '../../manager-dashboard/reports/reports.utils';

@Component({
  selector: 'planet-selector',
  template: `
    <mat-form-field>
      <mat-label i18n>Select Planet</mat-label>
      <mat-select [value]="selectedPlanet" (selectionChange)="onPlanetChange($event.value)">
        <mat-option *ngFor="let planet of planets" [value]="planet">{{planet.nameDoc ? planet.nameDoc.name : planet.doc.name}}</mat-option>
      </mat-select>
    </mat-form-field>
  `
})
export class PlanetSelectorComponent implements OnChanges {

  @Input() planetCodes: string[] = [];
  @Output() selectionChange = new EventEmitter<any>();
  planets: any[] = [];
  selectedPlanet: any;

  constructor(
    private managerService: ManagerService,
    private stateService: StateService
  ) {}

  ngOnChanges() {
    if (!this.planetCodes) {
      return;
    }
    const configuration = this.stateService.configuration;
    const { planetCode: localCode } = configuration;
    const name = (planet) => planet.nameDoc ? planet.nameDoc.name : planet.doc.name;
    this.managerService.getChildPlanets(true, localCode).subscribe(childPlanets => {
      const planets = attachNamesToPlanets([ configuration, ...childPlanets ]);
      this.planets = this.planetCodes.map(planetCode => planets.find((planet: any) => planet.doc.code === planetCode))
        .filter(planet => planet)
        .sort((a, b) => {
          if (a.doc.code === localCode) {
            return -1;
          }
          if (b.doc.code === localCode) {
            return 1;
          }
          return name(a).toLowerCase() > name(b).toLowerCase() ? 1 : -1;
        });
      if (this.planets[0]) {
        this.onPlanetChange(this.planets[0]);
      }
    });
  }

  onPlanetChange(newPlanet) {
    this.selectedPlanet = newPlanet;
    this.selectionChange.emit(newPlanet);
  }

}
