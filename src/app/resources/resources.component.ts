import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { Headers, Http } from '@angular/http';
import * as _ from 'underscore';

@Component({
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})
export class ResourcesComponent implements OnInit {

  upload_files = [];
  attachments = [];
  message = "";
  _: any = _;
 
  constructor(private couchService: CouchService,private http: Http,private router: Router) { }

  ngOnInit() {
    this.getAllAttachment();
  }

  onChange(event) {
    var files = event.target.files;
    this.upload_files.push(
      {
        "name": files[0].name,
        "type": files[0].type
      });

    var filetype = this.upload_files[0].type;
    var headers = new Headers({'Content-Type': filetype});
    var filename = this.upload_files[0].name;
    var defaultOpts = {headers:headers,withCredentials:true};

    this.couchService.post('/resources',{}).then(
      (data) => {
        //upload files in the given id
        var url = 'resources/' + data.id + '/' + filename + '?rev=' + data.rev;
        this.couchService.saveAttachment(
          url,files[0],filetype)
          .then(
            (data)=>{
              this.message = "Success";
              event.target.files = null;
              this.getAllAttachment();
            },(error)=>{
              this.message = "Error: " + error;
            }
          );
      },
      (error) => {
        this.message = "Error: " + error;
      }
    )
  }

  getAllAttachment(){
    this.couchService.get('resources/_all_docs?include_docs=true')
    .then((data) => {
        this.attachments = data.rows;
    }, (error) => this.message = 'Error: ' + error);
  }

}
