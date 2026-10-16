import { TestBed, inject } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { of } from 'rxjs/observable/of';

import { CouchService } from '@shared/database/couchdb.service';

import { ValidatorService } from './validator.service';

describe('ValidatorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [ValidatorService, CouchService, provideHttpClient(withInterceptorsFromDi())]
    });
  });

  it('should be created', inject([ ValidatorService ], (service: ValidatorService) => {
    expect(service).toBeTruthy();
  }));
});
