import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CouchService } from '../shared/database/couchdb.service';
import { ConfigurationCheckService } from './configuration-check.service';

describe('ConfigurationCheckService', () => {
  const noAdminFor = (userCtx: any) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CouchService, useValue: { get: vi.fn(() => of({ ok: true, userCtx })) } },
        { provide: Router, useValue: { url: '/', navigate: vi.fn() } }
      ]
    });
    let noAdmin: boolean;
    TestBed.inject(ConfigurationCheckService).checkAdminExistence().subscribe(result => noAdmin = result);
    return noAdmin;
  };

  it('treats an anonymous _admin session as a planet with no admin yet', () => {
    expect(noAdminFor({ name: null, roles: [ '_admin' ] })).toBe(true);
  });

  it('does not treat a signed-in server admin as a missing admin', () => {
    expect(noAdminFor({ name: 'guatemala-admin', roles: [ '_admin' ] })).toBe(false);
  });
});
