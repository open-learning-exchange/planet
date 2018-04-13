import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: './courses-view.component.html'
})

export class CoursesViewComponent implements OnInit {

  courseDetail: any = {};
  parent = this.route.snapshot.data.parent;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getCourse(params.get('id'))))
      .debug('Getting course id from parameters')
      .subscribe((course) => {
        this.courseDetail = course;
      }, error => console.log(error));
  }

  getCourse(id: string) {
    if (this.parent) {
      return this.couchService.get('courses/' + id,  { domain: this.userService.getConfig().parent_domain } );
    }
    return this.couchService.get('courses/' + id);
  }

}
