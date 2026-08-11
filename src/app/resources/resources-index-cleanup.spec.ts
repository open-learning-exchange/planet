import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ResourcesComponent } from './resources.component';

const createComponent = (
  couchService: object,
  chatService: object,
  planetMessageService: object = { 'showAlert': vi.fn() }
) => new ResourcesComponent(
  couchService as any,
  {} as any,
  {} as any,
  { 'snapshot': { 'data': { 'parent': false } } } as any,
  planetMessageService as any,
  { 'get': () => ({ 'name': 'amara' }) } as any,
  {} as any,
  {} as any,
  {} as any,
  { 'configuration': { 'planetType': 'community', 'code': 'planet-a' } } as any,
  {} as any,
  {} as any,
  {} as any,
  { 'watchDeviceType': () => of(0) } as any,
  {} as any,
  { 'hasFileSearchProvider': () => true, ...chatService } as any
);

describe('resource index cleanup', () => {
  it('asks the gateway to clean deployment-local index state before every resource deletion', async () => {
    const couchService = { 'delete': vi.fn().mockReturnValue(of({ 'id': 'res1' })) };
    const chatService = { 'removeResourceIndexes': vi.fn().mockReturnValue(of({ 'results': [] })) };
    const component = createComponent(couchService, chatService);
    const resource = { '_id': 'res1', '_rev': '1-a', 'doc': { 'title': 'Guide' } };

    await component.deleteResource(resource).request.toPromise();

    expect(chatService.removeResourceIndexes).toHaveBeenCalledWith([ 'res1' ]);
    expect(couchService.delete).toHaveBeenCalledWith('resources/res1?rev=1-a');
  });

  it('deletes the resource and warns when immediate index cleanup is deferred', async () => {
    const couchService = { 'delete': vi.fn().mockReturnValue(of({ 'id': 'res1' })) };
    const chatService = { 'removeResourceIndexes': vi.fn().mockReturnValue(throwError({ 'status': 502 })) };
    const planetMessageService = { 'showAlert': vi.fn() };
    const component = createComponent(couchService, chatService, planetMessageService);

    await expect(component.deleteResource({ '_id': 'res1', '_rev': '1-a' }).request.toPromise()).resolves.toEqual({ 'id': 'res1' });
    expect(couchService.delete).toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith(expect.stringContaining('Cleanup will be retried'));
  });

  it('warns for structured deferred cleanup without displaying gateway text', async () => {
    const couchService = { 'delete': vi.fn().mockReturnValue(of({ 'id': 'res1' })) };
    const chatService = {
      'removeResourceIndexes': vi.fn().mockReturnValue(of({
        'results': [ { 'resourceId': 'res1', 'removed': false, 'deferred': true } ]
      }))
    };
    const planetMessageService = { 'showAlert': vi.fn() };
    const component = createComponent(couchService, chatService, planetMessageService);

    await component.deleteResource({ '_id': 'res1', '_rev': '1-a' }).request.toPromise();

    expect(planetMessageService.showAlert).toHaveBeenCalledWith(
      'The resource was deleted, but its AI search index could not be cleaned up now. Cleanup will be retried.'
    );
  });

  it('uses one cleanup request before bulk deletion regardless of selection size', async () => {
    const couchService = { 'post': vi.fn().mockReturnValue(of([])) };
    const chatService = { 'removeResourceIndexes': vi.fn().mockReturnValue(of({ 'results': [] })) };
    const component = createComponent(couchService, chatService);
    const resources = Array.from({ length: 40 }, (_, index) => ({ '_id': `res${index}`, '_rev': '1-a' }));

    await component.deleteResources(resources).request.toPromise();

    expect(chatService.removeResourceIndexes).toHaveBeenCalledTimes(1);
    expect(chatService.removeResourceIndexes).toHaveBeenCalledWith(resources.map((resource) => resource._id));
    expect(couchService.post).toHaveBeenCalledTimes(1);
  });

  it('cleans one immediate batch without reporting planned reconciliation as a failure', async () => {
    const couchService = { 'post': vi.fn().mockReturnValue(of([])) };
    const chatService = { 'removeResourceIndexes': vi.fn().mockReturnValue(of({ 'results': [] })) };
    const planetMessageService = { 'showAlert': vi.fn() };
    const component = createComponent(couchService, chatService, planetMessageService);
    const resources = Array.from({ length: 501 }, (_, index) => ({ '_id': `res${index}`, '_rev': '1-a' }));

    await component.deleteResources(resources).request.toPromise();

    expect(chatService.removeResourceIndexes).toHaveBeenCalledTimes(1);
    expect(chatService.removeResourceIndexes.mock.calls[0][0]).toHaveLength(500);
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('skips index cleanup when no file-search provider is enabled', async () => {
    const couchService = { 'delete': vi.fn().mockReturnValue(of({ 'id': 'res1' })) };
    const chatService = {
      'hasFileSearchProvider': () => false,
      'removeResourceIndexes': vi.fn()
    };
    const planetMessageService = { 'showAlert': vi.fn() };
    const component = createComponent(couchService, chatService, planetMessageService);

    await component.deleteResource({ '_id': 'res1', '_rev': '1-a' }).request.toPromise();

    expect(chatService.removeResourceIndexes).not.toHaveBeenCalled();
    expect(couchService.delete).toHaveBeenCalled();
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });
});
