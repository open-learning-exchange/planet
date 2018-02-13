import { TestBed, inject } from '@angular/core/testing';

import { PouchdbService } from './pouchdb.service';

describe('PouchdbService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PouchdbService]
    });
  });

  it('should be created', inject([PouchdbService], (service: PouchdbService) => {
    expect(service).toBeTruthy();
  }));
});
