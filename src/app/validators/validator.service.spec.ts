import { TestBed, inject } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ValidatorService } from './validator.service';
import { of } from 'rxjs/observable/of';

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
