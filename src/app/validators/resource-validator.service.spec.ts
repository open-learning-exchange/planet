import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { ResourceValidatorService } from './resource-validator.service';
import { HttpModule } from '@angular/http';
describe('ResourceValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpModule ],
      providers: [ ResourceValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ ResourceValidatorService ], (service: ResourceValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
