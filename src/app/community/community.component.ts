import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit {
  message = '';
  communities = [];
  selectedValue = '';
  selectedNation = '';
  nations = [];

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
        console.log(data)
        this.communities = data.rows;
      }, (error) => this.message = 'There was a problem getting Communities');
  }

  deleteCommunity(communityId, communityRev, index) {
    this.couchService.delete('communityregistrationrequests/' + communityId + '?rev=' + communityRev)
      .then((data) => {
        this.communities.splice(index,1);
      }, (error) => this.message = 'There was a problem deleting this community');
  }

  ngOnInit() {
    this.getcommunitylist();
    this.getnationlist();
  }

}
