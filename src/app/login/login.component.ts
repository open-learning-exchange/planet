import { Component, OnInit, Input, OnChanges, SimpleChange } from '@angular/core';
// import { FormGroup, FormControl } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    // form;

    constructor(
        private couchService: CouchService,
        private userService: UserService,
        private router: Router
    ) {}
    
    model = { name:'', password:'', repeatPassword:'' };
    message = "";

    ngOnInit(){
        // this.form = new FormGroup({
            // UserName = new FormControl(),
            // Password = new FormControl()
        // });
        console.log(this.userService.get());
    }        

    onSubmit = function(user){
        this.login(user);
    }
    
    login(user) {
        this.couchService.post('_session', {'name':user.UserName, 'password':user.Password}, { withCredentials:true })
        .then((data) => { 
            this.router.navigate(['/dashboard']);
        },(error) => this.message = 'Username and/or password do not match');
    }
}
