import { Component, OnInit } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {

   isLoggedIn = '';

  constructor(
        private userService: UserService,
        private router: Router,
        private couchService: CouchService
  ) { }

  ngOnInit() {
      this.isLoggedIn = this.userService.get();
  }
  
  logout(){
     this.couchService.delete('_session',{ withCredentials:true }).then((data:any) => {
        if(data.ok === true) {
            this.router.navigate(['/login'], {});
        }
    });
  }

}
