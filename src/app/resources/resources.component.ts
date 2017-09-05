import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { Headers, Http } from '@angular/http';

@Component({
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})
export class ResourcesComponent implements OnInit {

  upload_files = [];
  attachments = [];
  message = "";
 
  constructor(private couchService: CouchService,private http: Http,private router: Router) { }

  ngOnInit() {
    this.getAllAttachment();
  }

  onChange(event) {
    var files = event.target.files[0];
    var filename = files.name;
    var filetype = files.type;
    
    this.couchService.post('resources',{'filename' : filename}).then(
      (data) => {
        //upload files in the given id
        var url = 'resources/' + data.id + '/' + filename + '?rev=' + data.rev;
        this.couchService.saveAttachment(
          url,files,filetype)
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
