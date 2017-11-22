import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NationValidatorService } from './nation-validator.service';
import { HttpModule } from '@angular/http';

describe('NationValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpModule, HttpClientModule ],
      providers: [ NationValidatorService, CouchService ]
    });
  });

  it('should be created', inject([ NationValidatorService ], (service: NationValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
