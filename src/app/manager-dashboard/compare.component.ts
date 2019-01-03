import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './compare.component.html',
  styles: [`
    .full-view-container {
      grid-template-columns: 1fr;
      grid-template-areas: "detail";
      grid-column-gap: 0;
    }
    .compare-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-areas: "detail view";
      height: calc(100vh - 382px);
    }
  `]
})

export class CompareComponent implements OnInit {

  onDestroy$ = new Subject<void>();
  remoteCopy: any = { };
  localCopy: any = { };
  fullView = 'on';
  localView = 'off';
  remoteView = 'on';
  itemId: string;
  type: string;

  constructor(
    private route: ActivatedRoute,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(
      (params: ParamMap) => this.fetchItem(
        params.get('id')
      ), error => console.log(error)
    );
  }

  fetchItem(id) {
    this.couchService.get('send_items/' + id)
    .pipe(switchMap(send => {
      this.remoteCopy = send.item;
      this.itemId = send.item._id;
      this.type = send.db;
      return this.couchService.get(send.db + '/' + this.itemId);
    }))
    .subscribe((item) => {
      this.localCopy = item;
      console.log(this.remoteCopy, this.localCopy);
    });
  }
  
  toggleFullView(copy) {
    if (copy === 'remote') {
      this.remoteView = this.remoteView === 'on' ? 'off' : 'on';
    }
    if (copy === 'local') {
      this.localView = this.localView === 'on' ? 'off' : 'on';
    }
    this.fullView = (this.localView === 'off' || this.remoteView === 'off') ? 'on' : 'off';
    console.log(this.fullView);
  }

}
