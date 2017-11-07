import { TestBed, inject } from '@angular/core/testing';

import { NationValidatorService } from './nation-validator.service';

describe('NationValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ NationValidatorService ]
    });
  });

  it('should be created', inject([ NationValidatorService ], (service: NationValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
