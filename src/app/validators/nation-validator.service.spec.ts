import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { NationValidatorService } from './nation-validator.service';
import { HttpModule } from '@angular/http';

describe('NationValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpModule ],
      providers: [ NationValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ NationValidatorService ], (service: NationValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
