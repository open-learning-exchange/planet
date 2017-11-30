
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { CouchService } from '../shared/couchdb.service';

export class userData  {
  firstName:string;
  middleName:string;
  lastName:string;
  login:string;
  password:string;
  repeatPassword:string;
  email:string;
  phone:number;
  language:string;
  gender:string;
  levels:number;
  birthday:number;
  birthmonth:number;
  birthyear:number;
  community:string;
  region:string;
  nation:string;
}

@Component({
  selector: 'app-register',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {

 newUser:userData= new userData();
 educationLevels:Array<any>=[1,2,3,4,5,6,7,8,9,11,12,"Higher"];
 birthmonths:Array<any>=[1,2,3,4,5,6,7,8,9,11,12];
 length:number= new Date().getFullYear();
 birthyears:number[] = new Array(length);
 birthdays:number[]= new Array();
 RegisterErrorMessage:string;
 validated:boolean;
 createMode:boolean=false;
 loginMode:boolean=true;
 loginData = { username: '', password: '' };
 loginMessage:string;

 constructor(
   private router: Router,
   private couchService: CouchService
   ) {
   for (var i = this.length; i >1900; i--) {
     this.birthyears.push(i);
   }
   for (var j = 1; j < 32; j++) {
     this.birthdays.push(j+0);
   }
 }

  ngOnInit() {

  }

  login(data){
    if (!data.username||!data.password) {
      this.loginMessage='Both Username and Password  are required';
    }
    else{
      this.couchService.post('_session', { 'name': data.username, 'password': data.password}, { withCredentials: true })
      .then((data) => {
        this.router.navigate(['/']);
      }, (error) => this.loginMessage = 'Username and/or password do not match');
    }
  }
  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs')
    .then((data) => {
      return true; // user can see data so there is no admin
    }, (error) => {
      return false; // user doesn't have permission so there is an admin
    });
  }
  createAdmin() {
    this.couchService.put('_node/nonode@nohost/_config/admins/' + this.newUser.firstName, this.newUser.password).then((data)=> {
       this.setlogin(); // direct to the login page
     });
  }
  setregister(){
    this.createMode=true;
    this.loginMode=false;
  }
  setlogin(){
    this.createMode=false;
    this.loginMode=true;
  }
  createUser(data){
    this.validated=true;
    for(let propery in data){
      if (!data[propery]) {
        this.validated=false;
        this.RegisterErrorMessage= propery + " is Required";
        break;
      }
    }
    if(this.validated) {
      this.loginMode=false;
      this.RegisterErrorMessage='';
      if (data["password"] === data["Repeat Password"]) {
        this.checkAdminExistence().then((noAdmin) => {
          if (noAdmin) {
            this.createAdmin()
          }
          else{
            this.createrecord();
          }
        })
      }
      else {
        this.RegisterErrorMessage='Password Does not Match!';
      }
    }
  }

  createrecord() {
    console.log("creating new record");

      this.couchService.put('_users/org.couchdb.user:' + name, { 'name': this.newUser.firstName, 'password': this.newUser.password, 'roles': [], 'type': 'user' })
        .then((data) => {
          this.message = 'User created: ' + data.id.replace('org.couchdb.user:', '');
          this.setlogin();
        }
  }


}






