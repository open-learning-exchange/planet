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
  communities = [];
  filter = '';
  selectedValue ='';
  constructor(
    private couchService: CouchService
    ) { }

  getcommunitylist() {
    this.couchService.post('community/_find',{
                  "selector": {
                      "$and": [
                        {
                          "_id": { "$gt": null }
                        },
                        {
                          "nationName":  { $regex: '.*' + this.filter + '.*' }
                        },
                        {
                          "registrationRequest": { $regex: '.*' + this.selectedValue + '.*' }
                        }
                      ]
                    }
                  }
              )
    .then((data) => {
      this.communities = data.docs;
    }, (error) => this.message = 'There was a problem getting community');
  }

  filterCommunity() {
    this.getcommunitylist();
  }

  deleteCommunity(communityId, communityRev) {
    this.couchService.delete('community/' + communityId + '?rev=' + communityRev)
      .then((data) => {
        this.getcommunitylist();
      }, (error) => this.message = 'There was a problem deleting this.communities');
  }

  ngOnInit() {
    this.getcommunitylist();
  }

}
