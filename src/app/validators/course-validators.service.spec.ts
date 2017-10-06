import { TestBed, inject } from '@angular/core/testing';

import { CourseValidatorsService } from './course-validators.service';

describe('CourseValidatorsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CourseValidatorsService]
    });
  });

  it('should be created', inject([CourseValidatorsService], (service: CourseValidatorsService) => {
    expect(service).toBeTruthy();
  }));
});
