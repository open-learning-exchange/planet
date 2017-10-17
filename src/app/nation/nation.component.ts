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
	nation = [];

	constructor(
		private couchService: CouchService
	) { }

	ngOnInit() {
	}

	getNationList() {
		this.couchService.get('nations/_all_docs?include_docs=true')
			.then((data) => {
				console.log('Helo')
				console.log(data)
				this.nation = data.rows;
			}, (error) => this.message = 'There was a problem getting NationList');
	}

}
