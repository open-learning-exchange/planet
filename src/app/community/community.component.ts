import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'app-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnInit {
  message = '';
  community = [];
  filter = '';

  constructor(
    private couchService: CouchService
    ) { }

  getcommunitylist() {
      this.couchService.post('community/_find',{
                    "selector": {
                       "_id": {
                          "$gt": null
                        },
                        "nationName":  { $regex: '.*' + this.filter + '.*' }
                      }
                    }
                )
      .then((data) => {
        this.community = data.docs;
      }, (error) => this.message = 'There was a problem getting community');
  }

  deleteCommunity(communityId, communityRev) {
    console.log(communityId, communityRev)
    this.couchService.delete('community/' + communityId + '?rev=' + communityRev)
      .then((data) => {
        this.getcommunitylist();
      }, (error) => this.message = 'There was a problem deleting this community');
  }
  onKey() {
    this.getcommunitylist();
  }

  ngOnInit() {
    this.getcommunitylist();
  }

}
