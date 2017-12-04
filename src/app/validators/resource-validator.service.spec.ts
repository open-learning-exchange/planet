import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { ResourceValidatorService } from './resource-validator.service';
import { HttpClientModule } from '@angular/common/http';

describe('ResourceValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientModule ],
      providers: [ ResourceValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ ResourceValidatorService ], (service: ResourceValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
