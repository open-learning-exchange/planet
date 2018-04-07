import { TestBed, inject } from '@angular/core/testing';

import { PouchdbAuthService } from './pouchdb-auth.service';

describe('PouchdbAuthService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PouchdbAuthService]
    });
  });

  it('should be created', inject([PouchdbAuthService], (service: PouchdbAuthService) => {
    expect(service).toBeTruthy();
  }));
});
