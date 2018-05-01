import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsViewComponent } from '../shared/dialogs/dialogs-view.component';
import { HttpClient } from '@angular/common/http';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterDropdowns } from '../shared/table-helpers';
import { CouchService } from '../shared/couchdb.service';

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
      const { _id: nationId, _rev: nationRev } = nation;
      this.couchService.delete(this.dbName + '/' + nationId + '?rev=' + nationRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.nations.data = this.nations.data.filter((nat: any) => data.id !== nat._id);
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted nation: ' + nation.name);
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

  view(url) {
    if (url) {
      this.couchService.allDocs('configurations', { domain: url })
        .debug('Request data from external planet')
        .subscribe((res: any) => {
          this.viewNationDetailDialog = this.dialog.open(DialogsViewComponent, {
            width: '600px',
            data: {
              allData : res.length > 0 ? res[0] : [],
              title : res.length > 0 && res[0].planetType === 'nation' ? 'Nation Details' : 'Community Details'
             }
          });
        }, (error) => this.planetMessageService.showAlert('There was a problem getting parent details'));
    } else {
      this.planetMessageService.showAlert('There was a problem getting parent details');
    }
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
