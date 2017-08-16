import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'app-meetups',
  templateUrl: './meetups.component.html',
  styleUrls: ['./meetups.component.css']
})
export class MeetupsComponent implements OnInit {
  message = "";
  obj = [];	
  constructor(
  		private couchService: CouchService,
        private userService: UserService,
        private router: Router
  	) { }

  ngOnInit() {
  	this.couchService.get('meetups/_all_docs?include_docs=true')
        .then((data) => {
            this.obj = data.rows;
            console.log(data);
        }, (error) => this.message = '');
  }
    onDelete(meetups_id,rev_id,index){
        if(meetups_id) {
            this.couchService.delete('meetups/'+meetups_id+'?rev='+rev_id)
                .then((data) => {
                    this.obj.splice(index,1);
                }, (error) => this.message = '');
        } else {
            this.message = 'There is no meetups';
        }
    }

/*        onDelete(meetups_id,rev_id,index){
          if(meetups_id) {
              this.couchService.get('meetups/'+meetups_id+'?rev='+rev_id)
                  .then((data) => {
                      this.obj.splice(index,1);
                  }, (error) => this.message = '');
          } else {
              this.message = 'There is no meetups';
          }
      }
      */

}
