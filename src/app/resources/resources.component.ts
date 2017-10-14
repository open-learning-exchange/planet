import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Headers } from '@angular/http';

@Component({
  templateUrl: './resources.component.html'
})
export class ResourcesComponent implements OnInit {
  upload_files = [];
  // FROM OLD COUCH DB
  items = [
    {
      _id: 'bd13ee4258650c89aa53e8849d0a6119',
      _rev: '12-db142e5abbb6f076f0feacc05218c1ca',
      kind: 'Resource',
      status: 'accepted',
      title: 'gitter image',
      author: 'Sarah Lu',
      Publisher: 'na',
      language: 'English',
      Year: '2017',
      linkToLicense: '',
      subject: ['Arts'],
      Level: ['Professional'],
      Tag: null,
      Medium: 'Text',
      openWith: 'PDF.js',
      resourceFor: 'Default',
      resourceType: 'Textbook',
      uploadDate: '2017-06-30T04:00:00.000Z',
      averageRating: '',
      articleDate: '2017-06-30T04:00:00.000Z',
      addedBy: 'admin',
      openUrl: '',
      openWhichFile: '',
      sum: 14,
      timesRated: 4
    },
    {
      _id: 'f225abb632a8c71326b12a560d0038d5',
      _rev: '95-f83fa1dc5aba195997175a013806d7d9',
      kind: 'Resource',
      status: '',
      title: '2048',
      author: 'Gabriele Cirulli',
      Publisher: 'Drew Perlman',
      language: 'English',
      Year: '2016',
      linkToLicense:
        'https://raw.githubusercontent.com/gabrielecirulli/2048/master/LICENSE.txt',
      subject: ['Arts', 'Learning', 'Math'],
      Level: [
        'Early Education',
        'Lower Primary',
        'Upper Primary',
        'Lower Secondary',
        'Upper Secondary',
        'Undergraduate',
        'Graduate',
        'Professional'
      ],
      Tag: null,
      Medium: 'Text',
      openWith: 'HTML',
      resourceFor: 'Default',
      resourceType: 'Activities',
      uploadDate: '2016-07-21T04:00:00.000Z',
      averageRating: '',
      articleDate: '2016-07-21T04:00:00.000Z',
      addedBy: 'admin',
      openUrl: '',
      sum: 7,
      timesRated: 3
    },
    {
      _id: '649ff1c7ed6d809eabe6d2165b000bf6',
      _rev: '21-6634a481bfee4a635ba2d724f9d4bc45',
      kind: 'Resource',
      status: 'accepted',
      title: 'Turtle Block JS',
      author: 'Sugar Labs',
      Publisher: 'Sugar Labs',
      language: 'javascript',
      Year: '2017',
      linkToLicense:
        'https://github.com/walterbender/turtleblocksjs/blob/master/Licence.txt',
      subject: ['Technology'],
      Level: [
        'Early Education',
        'Lower Primary',
        'Upper Primary',
        'Lower Secondary',
        'Upper Secondary',
        'Undergraduate',
        'Graduate',
        'Professional'
      ],
      Tag: null,
      Medium: 'Text',
      openWith: 'HTML',
      resourceFor: 'Learner',
      resourceType: 'Activities',
      uploadDate: '2017-01-24T17:00:00.000Z',
      averageRating: '',
      articleDate: '2017-01-24T17:00:00.000Z',
      addedBy: 'mappuji',
      openUrl: '',
      sum: 16,
      timesRated: 4
    }
  ];
  resources = [];
  message = '';
  file: any;
  resource = { mediaType: '' };

  constructor(private couchService: CouchService) {}

  ngOnInit() {
    this.getResources();
  }

  bindFile(event) {
    this.file = event.target.files[0];
  }

  submitResource() {
    const reader = new FileReader(),
      rComp = this;
    reader.readAsDataURL(this.file);
    reader.onload = () => {
      // FileReader result has file type at start of string, need to remove for CouchDB
      const fileData = reader.result.split(',')[1],
        attachments = {};

      attachments[rComp.file.name] = {
        content_type: rComp.file.type,
        data: fileData
      };

      const resource = Object.assign(
        {},
        {
          filename: rComp.file.name,
          _id: rComp.file.name,
          _attachments: attachments
        },
        rComp.resource
      );

      this.couchService.put('resources/' + rComp.file.name, resource).then(
        data => {
          this.message = 'Success';
          this.getResources();
        },
        error => {
          this.message = 'Error';
        }
      );
    };
  }

  getResources() {
    this.couchService
      .get('resources/_all_docs?include_docs=true')
      .then(data => {
        this.resources = data.rows;
      }, error => (this.message = 'Error'));
  }
}
