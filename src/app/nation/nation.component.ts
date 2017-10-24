import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';

@Component({
	selector: 'app-nation',
	templateUrl: './nation.component.html',
	styleUrls: ['./nation.component.scss'],
	template: `<h1>Nation List</h1>
				<p>{{message}}</p>
				<table class="table table-bordered table-hover">
					<thead>
						<tr>
							<th>Nation Name</th>
							<th>Admin Name</th>
							<th>Nation Url</th>
						</tr>
					</thead>
					<tbody>
						<tr *ngFor="let nations of nation | paginate: { itemsPerPage: 2, currentPage: p }">
							<td>{{nations.doc.name}}</td>
							<td>{{nations.doc.admin_name}}</td>
							<td>{{nations.doc.nationurl}}</td>
						</tr>
					</tbody>
				</table>
				<pagination-controls (pageChange)="p = $event"></pagination-controls> `
})
export class NationComponent implements OnInit {
	message = '';
	nation = [];
	p: number = 1;
	constructor(
		private couchService: CouchService
	) { }

	ngOnInit() {
		this.getNationList();
	}

	getNationList() {
		this.couchService.get('nations/_all_docs?include_docs=true')
			.then((data) => {
				this.nation = data.rows;
			}, (error) => this.message = 'There was a problem getting NationList');
	}

}
