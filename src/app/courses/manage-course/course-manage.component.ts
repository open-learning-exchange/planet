import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  templateUrl: './course-manage.component.html'
})
export class CourseManageComponent implements OnInit, OnDestroy {
  id: string;
  courses: any;
  private sub: any;

  constructor(
    private route: ActivatedRoute,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      this.id = params['id'];
    });
    this.couchService.get('courses/' + this.id)
      .then((data) => {
        this.courses = data.courseTitle;
      }); 
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
    
}