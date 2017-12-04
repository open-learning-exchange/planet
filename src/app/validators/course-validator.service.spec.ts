import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { CourseValidatorService } from './course-validator.service';
import { HttpClientModule } from '@angular/common/http';
describe('CourseValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientModule ],
      providers: [ CourseValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ CourseValidatorService ], (service: CourseValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
