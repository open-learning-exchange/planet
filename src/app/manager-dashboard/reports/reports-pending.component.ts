import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { attachNamesToPlanets } from './reports.utils';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { NgFor } from '@angular/common';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { PendingTableComponent } from './pending-table.component';

@Component({
    templateUrl: './reports-pending.component.html',
    imports: [MatToolbar, MatIconButton, RouterLink, MatIcon, MatToolbarRow, NgFor, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, PendingTableComponent]
})
export class ReportsPendingComponent implements OnInit {

  data = [];
  planets = [];
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'nation' ? 'Community' : 'Nation';
  }
  displayedColumns = [ 'item' ];

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService
  ) {}

  ngOnInit() {
    this.getCommunityList();
  }

  filterData() {
    this.planets = this.planets.map((planet: any) => ({
      ...planet.doc,
      name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name,
      children: this.data.filter((item: any) => item.sendTo === planet.doc.code)
    }));
  }

  getCommunityList() {
    forkJoin([
      this.couchService.findAll('send_items'),
      this.managerService.getChildPlanets()
    ]).subscribe(([ data, planets ]) => {
      this.planets = attachNamesToPlanets(planets).filter((planet: any) => planet.doc.docType !== 'parentName');
      this.data = data;
      this.filterData();
    }, (error) => this.planetMessageService.showAlert($localize`There was a problem getting ${this.childType}`));
  }

}
