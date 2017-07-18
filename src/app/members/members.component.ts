import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'app-members',
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.css']
})
export class MembersComponent implements OnInit {

  message = "";
  obj = [];
  constructor(
        private couchService: CouchService,
        private userService: UserService,
        private router: Router
    ) {}

  ngOnInit() {
     this.couchService.get('_users/_all_docs?include_docs=true')
        .then((data) => {
            this.obj = data.rows;
            console.log(data);
        }, (error) => this.message = '');
  }

    onDelete(member_id,rev_id,index){
        if(member_id) {
            this.couchService.delete('_users/'+member_id+'?rev='+rev_id)
                .then((data) => {
                    this.obj.splice(index,1);
                }, (error) => this.message = '');
        } else {
            this.message = 'There is no member';
        }
    }
    
}
