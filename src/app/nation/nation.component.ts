import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsViewComponent } from '../shared/dialogs/dialogs-view.component';
import { HttpClient } from '@angular/common/http';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterDropdowns } from '../shared/table-helpers';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

@Component({
  templateUrl: './nation.component.html'
})

export class NationComponent implements OnInit, AfterViewInit {
  nationsList = [];
  nations = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'code', 'url', 'status', 'action' ];
  readonly dbName = 'nations';
  message = '';
  deleteDialog: any;
  viewNationDetailDialog: any;
  parentType = this.route.snapshot.paramMap.get('planet');
  selectedNation = '';
  selectFilter = false;
  filter = {
    'registrationRequest': '',
    'parentDomain': ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private couchService: CouchService,
    private dialog: MatDialog,
    private http: HttpClient,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.nations.filterPredicate = filterDropdowns(this.filter);
    this.getNationList();
    this.nations.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  ngAfterViewInit() {
    this.nations.sort = this.sort;
    this.nations.paginator = this.paginator;
  }

  getNationList() {
    this.couchService.allDocs(this.dbName)
      .subscribe((data) => {
        this.nations.data = data.map(nation => {
          if (nation.name === this.route.snapshot.paramMap.get('nation')) {
            this.filter.parentDomain = nation.localDomain;
          }
          if (this.route.snapshot.paramMap.get('nation') !== null) {
            this.getCommunity(this.filter.parentDomain);
            this.selectFilter = true;
          }
          return nation;
        });
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  deleteClick(nation) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteNation(nation),
        changeType: 'delete',
        type: 'nation',
        displayName: nation.name
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteNation(nation) {
    // Return a function with nation on its scope so it can be called from the dialog
    return () => {
      const { _id: nationId, _rev: nationRev, code: nationCode } = nation;
      // Search for registration request with same code
      this.couchService.post('communityregistrationrequests/_find', { 'selector': { 'code': nationCode } })
        .pipe(switchMap((requestData) => {
          const observables = [
            this.couchService.delete(this.dbName + '/' + nationId + '?rev=' + nationRev)
          ];
          // Search user if registration request found
          if ( requestData.docs.length) {
            const registrationReq = requestData.docs[0];
            observables.push(
              this.couchService.post('_users/_find', { 'selector': { 'requestId': registrationReq._id } })
              .pipe(switchMap((userData) => {
                // Return ok if user not found
                if ( !userData.docs.length) {
                  return of({ ok: true });
                }
                const user = userData.docs[0];
                return this.couchService.delete('_users/org.couchdb.user:' + user.name);
              }))
            );
            observables.push(
              this.couchService.delete('communityregistrationrequests/' + registrationReq._id + '?rev=' + registrationReq._rev)
            );
          }
          return forkJoin(observables);
        })).subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.nations.data = this.nations.data.filter((nat: any) => data[0].id !== nat._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted nation: ' + nation.name);
      }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this nation');
    };
  }

  communityList(nationname) {
    this.router.navigate([ '/associated/community/' + nationname ]);
  }

  getCommunity(url) {
    this.couchService.allDocs('nations', { domain: url })
      .subscribe((res: any) => {
        this.nations.data = res.rows.map(nations => {
          return nations;
        });
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  view(planet) {
    this.viewNationDetailDialog = this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: planet,
        title: planet.planetType === 'nation' ? 'Nation Details' : 'Community Details'
      }
    });
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Changing the filter string to trigger filterPredicate
    this.nations.filter = filterValue;
    if (field === 'parentDomain') {
      this.getCommunity(filterValue);
    }
  }

  back() {
    this.router.navigate([ '/manager' ]);
  }

}
