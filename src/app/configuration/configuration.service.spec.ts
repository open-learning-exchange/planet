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

  const securityDb = '_users/_security';
  const couchServiceMock = {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    updateDocument: vi.fn()
  };

  const documentsWrittenTo = (db: string) => couchServiceMock.updateDocument.mock.calls.filter(([ calledDb ]) => calledDb === db);
  const callsTo = (mock: { mock: { calls: any[][] } }, db: string) => mock.mock.calls.filter(([ calledDb ]) => calledDb === db);
  const securityWasTouched = () => callsTo(couchServiceMock.get, securityDb).length > 0 ||
    callsTo(couchServiceMock.put, securityDb).length > 0;

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
      customVoiceLabels: [ 'Abuela' ],
      keys: { openai: 'sk-openai' },
      models: { openai: 'gpt-5' }
    };
    couchServiceMock.get.mockReset();
    couchServiceMock.put.mockReset();
    couchServiceMock.post.mockReset();
    couchServiceMock.updateDocument.mockReset();
    couchServiceMock.get.mockImplementation((db: string) => of(db === securityDb ? { admins: { roles: [] } } : storedConfiguration));
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

  describe('patchLocalConfiguration', () => {
    it('writes nothing but the local configuration', () => {
      service.patchLocalConfiguration({ _id: 'config_id', customVoiceLabels: [ 'Abuela', 'Maestro' ] }).subscribe();
      expect(documentsWrittenTo('configurations').length).toBe(1);
      expect(couchServiceMock.updateDocument.mock.calls.length).toBe(1);
      expect(couchServiceMock.post).not.toHaveBeenCalled();
      expect(securityWasTouched()).toBe(false);
    });

    it('merges the patch onto the latest local revision', () => {
      service.patchLocalConfiguration({ customVoiceLabels: [ 'Maestro' ] }).subscribe();
      expect(couchServiceMock.get).toHaveBeenCalledWith('configurations/config_id');
      const [ [ , writtenDoc ] ] = documentsWrittenTo('configurations');
      expect(writtenDoc).toMatchObject({ _rev: '3-local', customVoiceLabels: [ 'Maestro' ], name: 'Guatemala' });
    });

    it('keeps the secret keys the caller never submitted', () => {
      service.patchLocalConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();
      const [ [ , writtenDoc ] ] = documentsWrittenTo('configurations');
      expect(writtenDoc.keys).toEqual({ openai: 'sk-openai' });
    });

    it('drops a stale revision the caller supplied in favour of the fetched one', () => {
      service.patchLocalConfiguration({ _id: 'config_id', _rev: '1-stale', customVoiceLabels: [ 'Maestro' ] }).subscribe();
      const [ [ , writtenDoc ] ] = documentsWrittenTo('configurations');
      expect(writtenDoc._rev).toBe('3-local');
    });

    it('emits the written document', () => {
      const emitted = vi.fn();
      service.patchLocalConfiguration({ customVoiceLabels: [ 'Maestro' ] }).subscribe(emitted);
      expect(emitted).toHaveBeenCalledTimes(1);
      expect(emitted.mock.calls[0][0]).toMatchObject({ _rev: '4-local', customVoiceLabels: [ 'Maestro' ] });
    });

    it('re-reads the configuration and writes again when the local write conflicts', () => {
      const updatedElsewhere = { ...storedConfiguration, _rev: '4-someone-else', name: 'Guate' };
      let reads = 0;
      couchServiceMock.get.mockImplementation((db: string) => {
        if (db === securityDb) {
          return of({ admins: { roles: [] } });
        }
        reads = reads + 1;
        return of(reads === 1 ? storedConfiguration : updatedElsewhere);
      });
      couchServiceMock.updateDocument.mockReturnValueOnce(throwError({ status: 409 }));
      service.patchLocalConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();
      const writes = documentsWrittenTo('configurations');
      expect(writes.length).toBe(2);
      expect(writes[0][1]).toMatchObject({ _rev: '3-local', name: 'Guatemala' });
      // The retry keeps the concurrent name change and still applies the patch
      expect(writes[1][1]).toMatchObject({ _rev: '4-someone-else', name: 'Guate', currency: { code: 'USD', symbol: '$' } });
    });

    it('gives up after retrying a conflict once', () => {
      couchServiceMock.updateDocument.mockReturnValue(throwError({ status: 409 }));
      const onError = vi.fn();
      service.patchLocalConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe({ error: onError });
      expect(documentsWrittenTo('configurations').length).toBe(2);
      expect(onError).toHaveBeenCalledWith({ status: 409 });
    });
  });

  describe('patchConfiguration', () => {
    it('writes nothing but the local configuration for a local only patch', () => {
      service.patchConfiguration({ customVoiceLabels: [ 'Abuela', 'Maestro' ] }).subscribe();
      expect(documentsWrittenTo('configurations').length).toBe(1);
      expect(couchServiceMock.post).not.toHaveBeenCalled();
      expect(documentsWrittenTo('communityregistrationrequests').length).toBe(0);
      expect(securityWasTouched()).toBe(false);
    });

    it('leaves _users/_security alone for a currency patch', () => {
      service.patchConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();
      expect(securityWasTouched()).toBe(false);
    });

    it('leaves _users/_security alone for a keys patch', () => {
      service.patchConfiguration({ keys: { openai: 'sk-rotated' } }).subscribe();
      expect(securityWasTouched()).toBe(false);
    });

    it('leaves _users/_security alone for a patch which only re-sends the registration', () => {
      service.patchConfiguration({ registrationRequest: 'pending' }).subscribe();
      expect(securityWasTouched()).toBe(false);
    });

    it('updates _users/_security when the patch owns autoAccept', () => {
      service.patchConfiguration({ autoAccept: false }).subscribe();
      expect(callsTo(couchServiceMock.get, securityDb).length).toBe(1);
      const [ [ , security ] ] = callsTo(couchServiceMock.put, securityDb);
      expect(security.admins.roles).not.toContain('openlearner');
    });

    it('takes autoAccept from the merged doc so an explicit true still grants the role', () => {
      service.patchConfiguration({ autoAccept: true }).subscribe();
      const [ [ , security ] ] = callsTo(couchServiceMock.put, securityDb);
      expect(security.admins.roles).toContain('openlearner');
    });

    it('does not touch the parent planet for a local only patch', () => {
      service.patchConfiguration({ keys: { openai: 'sk-rotated' } }).subscribe();
      expect(couchServiceMock.post).not.toHaveBeenCalled();
      expect(documentsWrittenTo('communityregistrationrequests').length).toBe(0);
    });

    it('does not treat an addressing _id as a change the parent needs to hear about', () => {
      service.patchConfiguration({ _id: 'config_id', customVoiceLabels: [ 'Maestro' ] }).subscribe();
      expect(couchServiceMock.post).not.toHaveBeenCalled();
      expect(documentsWrittenTo('communityregistrationrequests').length).toBe(0);
    });

    it('sends only the allowlisted public fields to the parent planet', () => {
      service.patchConfiguration({ registrationRequest: 'pending' }).subscribe();
      const [ [ , parentDoc, opts ] ] = documentsWrittenTo('communityregistrationrequests');
      expect(parentDoc.keys).toBeUndefined();
      expect(parentDoc.currency).toBeUndefined();
      expect(parentDoc.customVoiceLabels).toBeUndefined();
      expect(parentDoc.models).toBeUndefined();
      expect(parentDoc).toMatchObject({ code: 'guatemala', name: 'Guatemala', registrationRequest: 'pending' });
      expect(opts).toEqual({ domain: 'planet.earth' });
    });

    it('writes to the revision the parent holds rather than the local one', () => {
      service.patchConfiguration({ registrationRequest: 'pending' }).subscribe();
      const [ [ , parentDoc ] ] = documentsWrittenTo('communityregistrationrequests');
      expect(parentDoc).toMatchObject({ _id: 'parent_id', _rev: '9-parent' });
    });

    it('completes both side effects before emitting when the patch needs each of them', () => {
      const emitted = vi.fn();
      service.patchConfiguration({ autoAccept: false }).subscribe(emitted);
      expect(callsTo(couchServiceMock.put, securityDb).length).toBe(1);
      expect(documentsWrittenTo('communityregistrationrequests').length).toBe(1);
      expect(emitted).toHaveBeenCalledTimes(1);
    });

    const patches: [ string, any ][] = [
      [ 'a local only patch', { customVoiceLabels: [ 'Maestro' ] } ],
      [ 'a currency patch', { currency: { code: 'USD', symbol: '$' } } ],
      [ 'a keys patch', { keys: { openai: 'sk-rotated' } } ],
      [ 'a patch the parent hears about', { registrationRequest: 'pending' } ],
      [ 'a patch with both side effects', { autoAccept: false } ]
    ];

    patches.forEach(([ description, patch ]) => {
      it(`emits the updated local configuration exactly once for ${description}`, () => {
        const emitted = vi.fn();
        const completed = vi.fn();
        service.patchConfiguration(patch).subscribe({ next: emitted, complete: completed });
        expect(emitted).toHaveBeenCalledTimes(1);
        expect(emitted.mock.calls[0][0]).toMatchObject({ _id: 'config_id', _rev: '4-local', ...patch });
        expect(completed).toHaveBeenCalled();
      });
    });
  });
});
