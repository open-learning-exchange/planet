import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule } from '@angular/common/http';
import { ValidatorService } from './validator.service';

describe('ValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientModule ],
      providers: [ ValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ ValidatorService ], (service: ValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
