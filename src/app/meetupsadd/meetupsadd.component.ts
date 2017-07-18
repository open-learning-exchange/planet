import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'app-meetupsadd',
  templateUrl: './meetupsadd.component.html',
  styleUrls: ['./meetupsadd.component.css']
})
export class MeetupsaddComponent implements OnInit {
  message = "";
  obj = [];	
  constructor(
  		private couchService: CouchService,
        private userService: UserService,
        private router: Router
    ) { }

  model = { title:'', description:'' }

  ngOnInit() {
  }

  onSubmit(meetup){
      if(meetup.description != '' && meetup.title != '') {
      	console.log(meetup.description,meetup.title)
        this.couchService.post('meetups', {'title': meetup.title, 'description': meetup.description})
            .then((data) => {
                this.message = 'meetup created: ';
                //this.router.navigate(['']);
            }, (error) => this.message = '');
        } else {
            this.message = 'please fill up the form';
        }
  }

}
