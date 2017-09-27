import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Headers } from '@angular/http';

@Component({
  templateUrl: './resources.component.html'
})
export class ResourcesComponent implements OnInit {

  upload_files = [];
  resources = [];
  message = "";
  file:any;
  resource = { mediaType:'' }

  constructor(private couchService: CouchService) { }

  ngOnInit() {
    this.getResources();
  }

  bindFile(event) {
    this.file = event.target.files[0];
  }

  submitResource() {
    let reader = new FileReader(),
      rComp = this;
    reader.readAsDataURL(this.file);
    reader.onload = () => {
      // FileReader result has file type at start of string, need to remove for CouchDB
      let fileData = reader.result.split(',')[1],
        attachments = {};

      attachments[rComp.file.name] = {"content_type":rComp.file.type,"data":fileData};

      let resource = Object.assign({},{"filename":rComp.file.name,"_id":rComp.file.name,"_attachments":attachments},rComp.resource);

      this.couchService.put('resources/' + rComp.file.name,resource).then(
        (data) => {
          this.message = "Success";
          this.getResources();
        },(error) => {this.message = "Error"});
    }
  }

  getResources(){
    this.couchService.get('resources/_all_docs?include_docs=true')
    .then((data) => {
        this.resources = data.rows;
    }, (error) => this.message = 'Error');
  }

}
