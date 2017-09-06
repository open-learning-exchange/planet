import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Headers } from '@angular/http';

@Component({
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})
export class ResourcesComponent implements OnInit {

  upload_files = [];
  attachments = [];
  message = "";
 
  constructor(private couchService: CouchService) { }

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
        var url = 'resources/' + data.id + '/' + filename + '?rev=' + data.rev,
          fileOpts = { headers:new Headers({'Content-Type':filetype}) };
        this.couchService.put(url,files,fileOpts).then(
            (data)=>{
              this.message = "Success";
              event.target.files = null;
              this.getAllAttachment();
            },(error)=>{
              this.message = "Error";
            }
          );
      },
      (error) => {
        this.message = "Error";
      }
    )
  }

  getAllAttachment(){
    this.couchService.get('resources/_all_docs?include_docs=true')
    .then((data) => {
        this.attachments = data.rows;
    }, (error) => this.message = 'Error');
  }

}
