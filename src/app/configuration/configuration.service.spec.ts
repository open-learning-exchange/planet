import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CouchService } from '../shared/couchdb.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';
import { UserService } from '../shared/user.service';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService patches', () => {
  let service: ConfigurationService;
  let stateServiceMock: { configuration: any };
  let storedConfiguration: any;
  let parentConfiguration: any;

  const securityDb = '_users/_security';
  const couchServiceMock = {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    updateDocument: vi.fn()
  };

  const writesTo = (db: string) => couchServiceMock.updateDocument.mock.calls.filter(([ calledDb ]) => calledDb === db);
  const securityWasTouched = () => couchServiceMock.get.mock.calls.some(([ db ]) => db === securityDb) ||
    couchServiceMock.put.mock.calls.some(([ db ]) => db === securityDb);

  beforeEach(() => {
    storedConfiguration = {
      _id: 'config_id',
      _rev: '3-local',
      code: 'guatemala',
      name: 'Guatemala',
      parentDomain: 'planet.earth',
      autoAccept: true,
      currency: { code: 'GTQ', symbol: 'Q' },
      keys: { openai: 'sk-local' },
      models: { openai: 'gpt-5' },
      streaming: false
    };
    parentConfiguration = {
      _id: 'parent_id',
      _rev: '9-parent',
      code: 'guatemala',
      name: 'Guatemala',
      registrationRequest: 'accepted',
      keys: { openai: 'parent-copy' },
      models: { openai: 'parent-model' }
    };
    stateServiceMock = { configuration: { _id: 'config_id' } };
    couchServiceMock.get.mockReset();
    couchServiceMock.put.mockReset();
    couchServiceMock.post.mockReset();
    couchServiceMock.updateDocument.mockReset();
    couchServiceMock.get.mockImplementation((db: string) =>
      of(db === securityDb ? { admins: { roles: [ 'openlearner' ] } } : storedConfiguration));
    couchServiceMock.put.mockReturnValue(of({ ok: true }));
    couchServiceMock.post.mockReturnValue(of({ docs: [ parentConfiguration ] }));
    couchServiceMock.updateDocument.mockImplementation((db: string, doc: any) =>
      of({ ok: true, id: doc._id, rev: '4-written', doc: { ...doc, _rev: '4-written' } }));

    TestBed.configureTestingModule({
      providers: [
        ConfigurationService,
        { provide: CouchService, useValue: couchServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: UserService, useValue: { get: () => ({ name: 'admin' }), credentials: { name: 'admin' } } },
        { provide: ManagerService, useValue: {} },
        { provide: SyncService, useValue: {} }
      ]
    });
    service = TestBed.inject(ConfigurationService);
  });

  it('merges a local patch onto the latest revision without running side effects', () => {
    service.patchLocalConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();

    expect(couchServiceMock.get).toHaveBeenCalledWith('configurations/config_id');
    expect(writesTo('configurations')[0][1]).toMatchObject({
      _rev: '3-local',
      currency: { code: 'USD', symbol: '$' },
      keys: { openai: 'sk-local' },
      models: { openai: 'gpt-5' }
    });
    expect(couchServiceMock.post).not.toHaveBeenCalled();
    expect(securityWasTouched()).toBe(false);
  });

  it('ignores a stale revision supplied by the caller', () => {
    service.patchLocalConfiguration({ _id: 'config_id', _rev: '1-stale', streaming: true }).subscribe();

    expect(writesTo('configurations')[0][1]).toMatchObject({ _id: 'config_id', _rev: '3-local', streaming: true });
  });

  it('re-reads and reapplies a patch once after a conflict', () => {
    const updatedElsewhere = { ...storedConfiguration, _rev: '4-concurrent', name: 'Guate' };
    couchServiceMock.get
      .mockReturnValueOnce(of(storedConfiguration))
      .mockReturnValueOnce(of(updatedElsewhere));
    couchServiceMock.updateDocument.mockReturnValueOnce(throwError({ status: 409 }));

    service.patchLocalConfiguration({ currency: { code: 'USD', symbol: '$' } }).subscribe();

    expect(writesTo('configurations')).toHaveLength(2);
    expect(writesTo('configurations')[1][1]).toMatchObject({
      _rev: '4-concurrent',
      name: 'Guate',
      currency: { code: 'USD', symbol: '$' }
    });
  });

  it('preserves non-object errors from a failed local write', () => {
    couchServiceMock.updateDocument.mockReturnValueOnce(throwError('offline'));
    const onError = vi.fn();

    expect(() => service.patchLocalConfiguration({ streaming: true }).subscribe({ error: onError })).not.toThrow();
    expect(onError).toHaveBeenCalledWith('offline');
  });

  it('reports a missing configuration through the observable', () => {
    stateServiceMock.configuration = null;
    const onError = vi.fn();

    expect(() => service.patchLocalConfiguration({ streaming: true }).subscribe({ error: onError })).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'There is no local configuration to update' }));
  });

  it('patches the existing parent document without removing its other fields or status', () => {
    const emitted = vi.fn();

    service.patchConfiguration({ name: 'Guate' }).subscribe(emitted);

    expect(writesTo('communityregistrationrequests')[0][1]).toEqual({
      '_id': 'parent_id',
      '_rev': '9-parent',
      'code': 'guatemala',
      'name': 'Guate',
      'registrationRequest': 'accepted',
      'models': { openai: 'parent-model' }
    });
    expect(securityWasTouched()).toBe(false);
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted.mock.calls[0][0]).toMatchObject({ name: 'Guate', keys: { openai: 'sk-local' } });
  });

  it('keeps keys out of a new parent registration without dropping other local fields', () => {
    couchServiceMock.post.mockReturnValue(of({ docs: [] }));
    const addPlanetToParent = vi.spyOn(service, 'addPlanetToParent').mockReturnValue(of({ ok: true } as any));

    service.patchConfiguration({ registrationRequest: 'pending' }).subscribe();

    const [ parentDocument, isNewConfig ] = addPlanetToParent.mock.calls[0];
    expect(isNewConfig).toBe(true);
    expect(parentDocument).toMatchObject({
      registrationRequest: 'pending',
      models: { openai: 'gpt-5' },
      streaming: false,
      currency: { code: 'GTQ', symbol: 'Q' }
    });
    expect(parentDocument._rev).toBeUndefined();
    expect(parentDocument.keys).toBeUndefined();
  });

  it('updates security only when a public patch owns autoAccept', () => {
    service.patchConfiguration({ autoAccept: false }).subscribe();

    const securityWrite = couchServiceMock.put.mock.calls.find(([ db ]) => db === securityDb);
    expect(securityWrite[1].admins.roles).not.toContain('openlearner');
    expect(writesTo('communityregistrationrequests')[0][1]).toMatchObject({
      _rev: '9-parent',
      registrationRequest: 'accepted',
      autoAccept: false
    });
  });
});
