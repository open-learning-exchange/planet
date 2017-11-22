import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
declare var jQuery: any;

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit {
  message = '';
  communities = [];
  selectedValue = '';
  selectedNation = '';
  nations = [];
  deleteItem: any;

  constructor(
    private couchService: CouchService
  ) { }

  getnationlist() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .then((data) => {
        this.nations = data.rows;
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  getcommunitylist() {
     this.couchService.get('communityregistrationrequests/_all_docs?include_docs=true')
      .then((data) => {
        this.communities = data.rows;
      }, (error) => this.message = 'There was a problem getting Communities');
  }

  deleteClick(community, index) {
    // The ... is the spread operator. The below sets deleteItem a copy of the community.doc
    // object with an additional index property that is the index within the communites array
    this.deleteItem = { ...community.doc, index };
    jQuery('#planetDelete').modal('show');
  }

  deleteCommunity(community) {
    // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
    const { _id: id, _rev: rev, index } = community;
    this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev)
      .then((data) => {
        this.communities.splice(index, 1);
        jQuery('#planetDelete').modal('hide');
      }, (error) => this.message = 'There was a problem deleting this community');
  }

  ngOnInit() {
    this.getcommunitylist();
    this.getnationlist();
  }

}
