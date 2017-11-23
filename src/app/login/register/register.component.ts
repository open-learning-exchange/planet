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
  birthday:number;
  birthmonth:number;
  birthyear:number;
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
 educationLevels:Array<any>=[1,2,3,4,5,6,7,8,9,11,12,"Higher"];
 birthmonths:Array<any>=[1,2,3,4,5,6,7,8,9,11,12];
 length:number= new Date().getFullYear();
 birthyears:number[] = new Array(length);
 birthdays:number[]= new Array();
 RegisterErrorMessage:string;
  constructor(
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
  createUser(data){
    console.log(data);
    if (this.newUser.password!==this.newUser.repeatPassword) {
      this.RegisterErrorMessage="Password doesn't Match";
    }
    else{
      for(let propery in data){
        if (!data[propery]) {
          this.RegisterErrorMessage= propery + " is Required";
          break;
        }
      }
    }
    //console.log(this.newUser);

  }

}


