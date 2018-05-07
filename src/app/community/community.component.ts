import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatDialog } from '@angular/material';
import { switchMap, map } from 'rxjs/operators';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
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
    'language',
    'url',
    'status',
    'action'
  ];
  editDialog: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.getCommunityList();
    this.communities.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  ngAfterViewInit() {
    this.communities.paginator = this.paginator;
  }

  getCommunityList() {
     this.couchService.allDocs('communityregistrationrequests')
      .subscribe((data) => {
        this.communities.data = data;
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
              this.editDialog.close();
            }, (error) => this.editDialog.componentInstance.message = 'There was a problem accepting this community');
          break;
        case 'accept':
          forkJoin([
            // When accepting a registration request, add learner role to user from that community/nation,
            this.unlockUser(community),
            // add registrant's information to this database,
            this.couchService.post('nations', { ...communityInfo, registrationRequest: 'accepted' }),
            // update registration request to accepted
            this.couchService.put('communityregistrationrequests/' + communityId, { ...community, registrationRequest: 'accepted' })
          ]).subscribe((data) => {
            community.registrationRequest = 'accepted';
            this.updateRev(data, this.communities.data);
            this.editDialog.close();
          }, (error) => this.editDialog.componentInstance.message = 'Planet was not accepted');
      }
    };
  }

  deleteCommunity(community) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
    // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
      const { _id: id, _rev: rev, code: communityCode } = community;
      forkJoin([
        this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev),
        // Find nation with code as registration request code
        this.couchService.post('nations/_find', { 'selector': { 'code': communityCode } })
          .pipe(switchMap((nationData) => {
            if ( !nationData.docs.length ) {
              return of({ ok: true });
            }
            const nation = nationData.docs[0];
            return this.couchService.delete('nations/' + nation._id + '?rev=' + nation._rev);
          })),
        // Find user with requestId as registration Id
        this.couchService.post('_users/_find', { 'selector': { 'requestId': id } })
          .pipe(switchMap((userData) => {
            if ( !userData.docs.length ) {
              return of({ ok: true });
            }
            const user = userData.docs[0];
            return this.couchService.delete('_users/org.couchdb.user:' + user.name + '?rev=' + user._rev);
          }))
      ]).subscribe((data) => {
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
