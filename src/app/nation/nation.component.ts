import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsViewComponent } from '../shared/dialogs/dialogs-view.component';
import { HttpClient } from '@angular/common/http';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './nation.component.html'
})

export class NationComponent implements OnInit, AfterViewInit {
  nationsList = [];
  nations = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'admin_name', 'url', 'action' ];
  readonly dbName = 'nations';
  message = '';
  deleteDialog: any;
  ViewNationDetailDialog: any;
  parentType = this.route.snapshot.paramMap.get('planet');
  selectedNation = '';
  filter: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private couchService: CouchService,
    private dialog: MatDialog,
    private http: HttpClient,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.getNationList();
    if (this.route.snapshot.paramMap.get('nation') !== null) {
      this.getCommunity(this.selectedNation);
      this.filter = true;
    }
    // Override default matTable filter to only filter below fields
    this.nations.filterPredicate = filterSpecificFields([ 'name', 'code', 'admin_name', 'url' ]);
  }

  ngAfterViewInit() {
    this.nations.sort = this.sort;
    this.nations.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.nations.filter = filterValue;
  }

  getNationList() {
    this.couchService.get(this.dbName + '/_all_docs?include_docs=true')
      .subscribe((data) => {
        // _all_docs returns object with rows array of objects with 'doc' property that has an object with the data.
        // Map over data.rows to remove the 'doc' property layer
        this.nations.data = this.nationsList = data.rows.map(nations => {
          if (nations.doc.name === this.route.snapshot.paramMap.get('nation')) {
            this.selectedNation = nations.doc.local_domain;
          }
          return nations.doc;
        }).filter(nt  => {
          return nt['_id'].indexOf('_design') !== 0;
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
    this.http.jsonp('http:// ' + url + ' /community/_all_docs?include_docs=true&callback=JSONP_CALLBACK', 'callback')
      .debug('jsonp request to external nation')
      .subscribe((res: any) => {
        this.nations.data = res.rows.map(nations => {
          return nations.doc;
        }).filter(nt  => {
          return nt['_id'].indexOf('_design') !== 0;
        });
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  viewResources(nationname) {
    this.router.navigate([ '/resources/' + nationname ]);
  }

  view(url) {
    if (url) {
      this.http.jsonp('http://' + url + '/configurations/_all_docs?include_docs=true&callback=JSONP_CALLBACK', 'callback')
      .debug('jsonp request to external nation')
      .subscribe((res: any) => {
        this.ViewNationDetailDialog = this.dialog.open(DialogsViewComponent, {
          data: {
            allData : res.rows.length > 0 ? res.rows[0].doc : [],
            title : 'Nation Details'
          }
        });
      });
    } else {
      this.message = 'There is no data.';
    }
  }

  onChange(filterValue: string) {
    this.getCommunity(filterValue);
  }

  onSelect(select: string) {
    this.nations.filter = select;
  }

  back() {
    this.router.navigate([ '/' ]);
  }

}
