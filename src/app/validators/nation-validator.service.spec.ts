import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule } from '@angular/common/http';
import { NationValidatorService } from './nation-validator.service';

describe('NationValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientModule ],
      providers: [ NationValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ NationValidatorService ], (service: NationValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
