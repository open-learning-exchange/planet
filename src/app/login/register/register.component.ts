import { Component, OnInit } from '@angular/core';

import { CouchService } from '../../shared/couchdb.service';

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
  birthdate:Date;
  community:string;
  region:string;
  nation:string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
 newUser:userData= new userData();

  constructor(
     private couchService: CouchService
    ) { }

  ngOnInit() {
  }
  createUser(){
    console.log(this.newUser);
    console.log("creating new user");
  }

}


