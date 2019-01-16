import { Component, Input, OnChanges } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'planet-compare-courses',
  templateUrl: './compare-courses.component.html'
})

export class CoursesCompareComponent implements OnChanges {

  @Input() courseDetail: any = { steps: [] };

  ngOnChanges() {
    this.courseDetail.steps = this.courseDetail.steps.map(step => {
      step.resources = step.resources.filter(res => res._attachments);
      return step;
    });
  }

  resourceUrl(resource) {
    if (resource._attachments && Object.keys(resource._attachments)[0]) {
      const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
      return environment.couchAddress + '/resources/' + resource._id + '/' + filename;
    }
  }
}
