import { Component, OnInit, Input, OnChanges, SimpleChange } from '@angular/core';
// import { FormGroup, FormControl } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    // form;

    constructor(
        private couchService: CouchService,
        // private router: Router
    ) {}
    
    model = { name:'', password:'', repeatPassword:'' };
    message = "";

    ngOnInit(){
        // this.form = new FormGroup({
            // UserName = new FormControl(),
            // Password = new FormControl()
        // });
    }        

    onSubmit = function(user){
        this.login(user);
    }
    
    login(user) {
        this.couchService.post('_session', {'name':user.UserName, 'password':user.Password}, { withCredentials:true })
            .then((data) => { 
                this.message = 'Hi, ' + data.name + '!';
                // this.reRoute();
                console.log(data);
            },(error) => this.message = 'Username and/or password do not match');
        /**this.couchService.post('_session', {'name':name, 'password':password}, { withCredentials:true })
            .then((data) => { 
                this.message = 'Hi, ' + data.name + '!';
                // this.reRoute();
            },(error) => this.message = 'Username and/or password do not match');**/
    }
}
