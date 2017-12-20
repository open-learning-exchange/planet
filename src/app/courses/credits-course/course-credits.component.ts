import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  templateUrl: './course-credits.component.html'
})
export class CourseCreditsComponent implements OnInit, OnDestroy {
  id: string;
  course: any;
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
        this.course = data.courseTitle;
      });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
