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
  filter = '';
  selectedValue = '';
  deleteItem = {};

  constructor(
    private couchService: CouchService
  ) { }

  getcommunitylist() {
    this.couchService.post('communityregistrationrequests/_find', {
      'selector': {
        '$and': [
          {
            '_id': { '$gt': null }
          },
          {
            'nationName': { $regex: '.*' + this.filter + '.*' }
          },
          {
            'registrationRequest': { $regex: '.*' + this.selectedValue + '.*' }
          }
        ]
      }
    })
    .then((data) => {
      this.communities = data.docs;
    }, (error) => this.message = 'There was a problem getting community');
  }

  filterCommunity() {
    this.getcommunitylist();
  }

  deleteClick(community,index) {
    this.deleteItem = { ...community, index: index };
    jQuery('#planetDelete').modal('show');
  }

  deleteCommunity(community) {
    // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
    const { _id: id, _rev: rev, index } = community;
    this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev)
      .then((data) => {
        this.getcommunitylist();
        jQuery('#planetDelete').modal('hide');
      }, (error) => this.message = 'There was a problem deleting this community');
  }

  ngOnInit() {
    this.getcommunitylist();
  }

}
