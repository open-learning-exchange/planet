import { TestBed, inject } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CouchService } from '@shared/database/couchdb.service';

import { ValidatorService } from './validator.service';

describe('ValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [ValidatorService, CouchService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    });
  });

  it('should be created', inject([ ValidatorService ], (service: ValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
