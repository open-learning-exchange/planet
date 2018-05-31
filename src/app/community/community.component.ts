import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatDialog, MatSort } from '@angular/material';
import { switchMap, map } from 'rxjs/operators';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
import { findDocuments } from '../shared/mangoQueries';
import { filterSpecificFields } from '../shared/table-helpers';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit, AfterViewInit {
  message = '';
  communities = new MatTableDataSource();
  nations = [];
  displayedColumns = [
    'name',
    'code',
    'preferredLang',
    'localDomain',
    'registrationRequest',
    'createdDate',
    'action'
  ];
  editDialog: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.getCommunityList();
    this.communities.sortingDataAccessor = (item, property) => item[property].toLowerCase();
    this.communities.filterPredicate = filterSpecificFields([ 'code', 'name' ]);
  }

  ngAfterViewInit() {
    this.communities.paginator = this.paginator;
    this.communities.sort = this.sort;
  }

  requestListFilter(filterValue: string) {
    this.communities.filter = filterValue;
  }

  getCommunityList() {
    this.couchService.post('communityregistrationrequests/_find',
      findDocuments({ 'registrationRequest': { '$ne': 'accepted' } }, 0, [ { 'createdDate': 'desc' } ] ))
      .subscribe((data) => {
        this.communities.data = data.docs;
      }, (error) => this.message = 'There was a problem getting Communities');
  }

  updateRev(item, array) {
    array = array.map((c: any) => {
      if (c._id === item.id) {
        c._rev = item.rev;
      }
      return c;
    });
  }

  updateClick(community, change) {
    this.editDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: change === 'delete' ? this.deleteCommunity(community) : this.updateCommunity(community, change),
        changeType: change,
        type: 'community',
        displayName: community.name
      }
    });
  }

  updateCommunity(community, change) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
      // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
      // Split community object into id, rev, and all other props in communityInfo
      const { _id: communityId, _rev: communityRev, ...communityInfo } = community;
      switch (change) {
        case 'delete':
        case 'reject':
        case 'unlink':
          const updatedCommunity = { ...community, registrationRequest: change };
          this.couchService.put('communityregistrationrequests/' + communityId, updatedCommunity)
            .subscribe((data) => {
              this.updateRev(data, this.communities.data);
              this.getCommunityList();
              this.editDialog.close();
            }, (error) => this.editDialog.componentInstance.message = 'There was a problem accepting this community');
          break;
        case 'accept':
          forkJoin([
            // When accepting a registration request, add learner role to user from that community/nation,
            this.unlockUser(community),
            // update registration request to accepted
            this.couchService.put('communityregistrationrequests/' + communityId, { ...community, registrationRequest: 'accepted' })
          ]).subscribe((data) => {
            community.registrationRequest = 'accepted';
            this.updateRev(data, this.communities.data);
            this.getCommunityList();
            this.editDialog.close();
          }, (error) => this.editDialog.componentInstance.message = 'Planet was not accepted');
      }
    };
  }

  // Checks response and creates couch call if a doc was returned
  addDeleteObservable(res, db) {
    if (res.docs.length > 0) {
      const doc = res.docs[0];
      return [ this.couchService.delete(db + doc._id + '?rev=' + doc._rev) ];
    }
    return [];
  }

  deleteCommunity(community) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
    // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
      const { _id: id, _rev: rev } = community;
      forkJoin([
        this.couchService.post('_users/_find', { 'selector': { '_id': 'org.couchdb.user:' + community.adminName } }),
        this.couchService.post('shelf/_find', { 'selector': { '_id': 'org.couchdb.user:' + community.adminName } })
      ]).pipe(switchMap(([ nation, user, shelf ]) => {
        const deleteObs = [ this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev) ].concat(
          this.addDeleteObservable(user, '_users/'),
          this.addDeleteObservable(shelf, 'shelf/')
        );
        return forkJoin(deleteObs);
      })).subscribe((data) => {
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.communities.data = this.communities.data.filter((comm: any) => data[0].id !== comm._id);
        this.editDialog.close();
      }, (error) => this.editDialog.componentInstance.message = 'There was a problem deleting this community');
    };
  }

  // Gives the requesting user the 'learner' role & access to all DBs (as of April 2018)
  unlockUser(community) {
    return this.couchService.post('_users/_find', { 'selector': { 'requestId': community._id } })
      .pipe(switchMap(data => {
        const user = data.docs[0];
        return this.couchService.put('_users/' + user._id + '?rev=' + user._rev,
          { ...user, roles: [ 'learner' ] });
      }));
  }

}
