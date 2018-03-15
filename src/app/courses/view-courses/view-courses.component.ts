import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';


@Component({
  templateUrl: './view-courses.component.html',
  styles: [ `
    /* Textare style */
    textarea {
      width: 600px;
      height: 110px;
      resize: none;
      overflow: auto;
    }
  ` ]
})

export class ViewCoursesComponent implements OnInit {

  courseDetail: any = {};

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getCourse(params.get('id'))))
      .debug('Getting resource id from parameters')
      .subscribe((course) => {
        this.courseDetail = course;
      }, error => console.log(error), () => console.log('complete getting resource id'));
  }

  getCourse(id: string) {
    return this.couchService.get('courses/' + id);
  }

}
