import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CouchService } from '../shared/couchdb.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';
import { UserService } from '../shared/user.service';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let storedConfiguration: any;

  const couchServiceMock = {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    updateDocument: vi.fn()
  };

  const documentsWrittenTo = (db: string) => couchServiceMock.updateDocument.mock.calls.filter(([ calledDb ]) => calledDb === db);

  beforeEach(() => {
    storedConfiguration = {
      _id: 'config_id',
      _rev: '3-local',
      code: 'guatemala',
      name: 'Guatemala',
      planetType: 'community',
      parentDomain: 'planet.earth',
      adminName: 'admin@guatemala',
      autoAccept: true,
      currency: { code: 'GTQ', symbol: 'Q' },
      keys: { openai: 'sk-openai' },
      models: { openai: 'gpt-5' }
    };
    couchServiceMock.get.mockReset();
    couchServiceMock.put.mockReset();
    couchServiceMock.post.mockReset();
    couchServiceMock.updateDocument.mockReset();
    couchServiceMock.get.mockImplementation((db: string) =>
      of(db === '_users/_security' ? { admins: { roles: [] } } : storedConfiguration));
    couchServiceMock.put.mockReturnValue(of({ ok: true }));
    couchServiceMock.post.mockReturnValue(of({ docs: [ { _id: 'parent_id', _rev: '9-parent' } ] }));
    couchServiceMock.updateDocument.mockImplementation((db: string, doc: any) =>
      of({ ok: true, id: doc._id, rev: '4-local', doc: { ...doc, _rev: '4-local' } }));

    TestBed.configureTestingModule({
      providers: [
        ConfigurationService,
        { provide: CouchService, useValue: couchServiceMock },
        { provide: StateService, useValue: { configuration: { _id: 'config_id' } } },
        { provide: UserService, useValue: { get: () => ({ name: 'admin' }), credentials: { name: 'admin' } } },
        { provide: ManagerService, useValue: {} },
        { provide: SyncService, useValue: {} }
      ]
    });
    service = TestBed.inject(ConfigurationService);
  });

  describe('patchConfiguration', () => {
    it('merges the patch onto the latest local revision', () => {
      service.patchConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();
      expect(couchServiceMock.get).toHaveBeenCalledWith('configurations/config_id');
      const [ [ , writtenDoc ] ] = documentsWrittenTo('configurations');
      expect(writtenDoc).toMatchObject({ _rev: '3-local', currency: { code: 'USD', symbol: '$' }, name: 'Guatemala' });
    });

    it('keeps the secret keys the caller never submitted', () => {
      service.patchConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();
      const [ [ , writtenDoc ] ] = documentsWrittenTo('configurations');
      expect(writtenDoc.keys).toEqual({ openai: 'sk-openai' });
    });

    it('does not touch the parent planet for a local only patch', () => {
      service.patchConfiguration({ keys: { openai: 'sk-rotated' } }).subscribe();
      expect(couchServiceMock.post).not.toHaveBeenCalled();
      expect(documentsWrittenTo('communityregistrationrequests').length).toBe(0);
    });

    it('sends only the allowlisted public fields to the parent planet', () => {
      service.patchConfiguration({ registrationRequest: 'pending' }).subscribe();
      const [ [ , parentDoc, opts ] ] = documentsWrittenTo('communityregistrationrequests');
      expect(parentDoc.keys).toBeUndefined();
      expect(parentDoc.currency).toBeUndefined();
      expect(parentDoc.models).toBeUndefined();
      expect(parentDoc).toMatchObject({ code: 'guatemala', name: 'Guatemala', registrationRequest: 'pending' });
      expect(opts).toEqual({ domain: 'planet.earth' });
    });

    it('emits the updated local configuration once the parent sync is done', () => {
      const emitted = vi.fn();
      const completed = vi.fn();
      service.patchConfiguration({ registrationRequest: 'pending' }).subscribe({ next: emitted, complete: completed });
      expect(emitted).toHaveBeenCalledTimes(1);
      expect(emitted.mock.calls[0][0]).toMatchObject({ _rev: '4-local', registrationRequest: 'pending', keys: { openai: 'sk-openai' } });
      expect(completed).toHaveBeenCalled();
    });

    it('writes to the revision the parent holds rather than the local one', () => {
      service.patchConfiguration({ registrationRequest: 'pending' }).subscribe();
      const [ [ , parentDoc ] ] = documentsWrittenTo('communityregistrationrequests');
      expect(parentDoc).toMatchObject({ _id: 'parent_id', _rev: '9-parent' });
    });

    it('re-reads the configuration and writes again when the local write conflicts', () => {
      const updatedElsewhere = { ...storedConfiguration, _rev: '4-someone-else', name: 'Guate' };
      let reads = 0;
      couchServiceMock.get.mockImplementation((db: string) => {
        if (db === '_users/_security') {
          return of({ admins: { roles: [] } });
        }
        reads = reads + 1;
        return of(reads === 1 ? storedConfiguration : updatedElsewhere);
      });
      couchServiceMock.updateDocument.mockReturnValueOnce(throwError({ status: 409 }));
      service.patchConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();
      const writes = documentsWrittenTo('configurations');
      expect(writes.length).toBe(2);
      expect(writes[0][1]).toMatchObject({ _rev: '3-local', name: 'Guatemala' });
      expect(writes[1][1]).toMatchObject({ _rev: '4-someone-else', name: 'Guate', currency: { code: 'USD', symbol: '$' } });
    });

    it('gives up after retrying a conflict once', () => {
      couchServiceMock.updateDocument.mockReturnValue(throwError({ status: 409 }));
      const onError = vi.fn();
      service.patchConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe({ error: onError });
      expect(documentsWrittenTo('configurations').length).toBe(2);
      expect(onError).toHaveBeenCalledWith({ status: 409 });
    });
  });
});
