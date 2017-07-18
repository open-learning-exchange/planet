import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    
    message = "";

  constructor(
        private couchService: CouchService,
        private userService: UserService,
        private router: Router
    ) {}

  ngOnInit() {
  }
  model = { name:'', password:'', repeatPassword:'' }
  
  onSubmit(user){
      if(user.Password === user.password_confirm) {
        this.couchService.put('_users/org.couchdb.user:' + user.UserName, {'name': user.UserName, 'password': user.Password, 'roles': [], 'type': 'user'})
            .then((data) => {
                this.message = 'user created: ' + data.id.replace('org.couchdb.user:','');
                this.router.navigate(['']);
            }, (error) => this.message = '');
        } else {
            this.message = 'passwords do not match';
        }
  }

}
