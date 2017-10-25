import { TestBed, inject } from '@angular/core/testing';

import { CourseValidatorService } from './course-validator.service';

describe('CourseValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CourseValidatorService]
    });
  });

  it('should be created', inject([CourseValidatorService], (service: CourseValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
