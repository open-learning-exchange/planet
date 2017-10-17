import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'app-nation',
  templateUrl: './nation.component.html',
  styleUrls: ['./nation.component.scss']
})
export class NationComponent implements OnInit {
message = '';
  constructor(
  	private couchService: CouchService,
  	private router: Router

  ) { }
  ngOnInit() {
  }
  onSubmit(nation) {
    if (nation.nation_name !== '' && nation.nationurl !== '' && nation.type !=="") {
    console.log(nation.nation_name, nation.nationurl, nation.type);
    this.couchService.post('nations', {'adminname':nation.admin_name, 'nationname': nation.nation_name,'nationurl':nation.nationurl, 'type':nation.type}, )
      .then((data) => {
      	alert('Nation has been sucessfully created');
      	 this.router.navigate(['']);
      }, (error) => this.message = 'Error');
    } else {
      this.message = 'Please complete the form';
    }
  }

}


