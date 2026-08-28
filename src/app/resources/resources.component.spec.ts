import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ResourcesComponent } from './resources.component';

const createComponent = (
  couchService: object,
  chatService: object,
  planetMessageService: object = { showAlert: vi.fn(), showMessage: vi.fn() },
  resourcesService: object = { requestResourcesUpdate: vi.fn() }
) => new ResourcesComponent(
  couchService as any,
  {} as any,
  {} as any,
  { snapshot: { data: { parent: false } } } as any,
  planetMessageService as any,
  { get: () => ({ name: 'amara' }) } as any,
  resourcesService as any,
  {} as any,
  {} as any,
  { configuration: { planetType: 'community', code: 'planet-a' } } as any,
  {} as any,
  {} as any,
  {} as any,
  { watchDeviceType: () => of(0) } as any,
  {} as any,
  {
    hasFileSearchProvider: () => true,
    removeResourceIndexes: () => of({ results: [] }),
    ...chatService
  } as any
);

describe('ResourcesComponent', () => {
  describe('AI index cleanup', () => {
    it('starts best-effort index cleanup before deleting without waiting for its result', async () => {
      const couchService = { delete: vi.fn().mockReturnValue(of({ id: 'res1' })) };
      const chatService = { removeResourceIndexes: vi.fn().mockReturnValue(of({ results: [] })) };
      const component = createComponent(couchService, chatService);
      const resource = { _id: 'res1', _rev: '1-a', doc: { title: 'Guide' } };

      await component.deleteResource(resource).request.toPromise();

      expect(chatService.removeResourceIndexes).toHaveBeenCalledWith([ 'res1' ]);
      expect(couchService.delete).toHaveBeenCalledWith('resources/res1?rev=1-a');
      expect(chatService.removeResourceIndexes.mock.invocationCallOrder[0])
        .toBeLessThan(couchService.delete.mock.invocationCallOrder[0]);
    });

    it('deletes silently when the gateway cannot clean the index immediately', async () => {
      const couchService = { delete: vi.fn().mockReturnValue(of({ id: 'res1' })) };
      const chatService = { removeResourceIndexes: vi.fn().mockReturnValue(throwError({ status: 502 })) };
      const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
      const component = createComponent(couchService, chatService, planetMessageService);

      await expect(component.deleteResource({ _id: 'res1', _rev: '1-a' }).request.toPromise())
        .resolves.toEqual({ id: 'res1' });

      expect(couchService.delete).toHaveBeenCalled();
      expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    });

    it('does not hold resource deletion open while immediate cleanup is pending', async () => {
      vi.useFakeTimers();
      try {
        const couchService = { delete: vi.fn().mockReturnValue(of({ id: 'res1' })) };
        const cleanupUnsubscribed = vi.fn();
        const chatService = {
          removeResourceIndexes: vi.fn().mockReturnValue(new Observable(() => () => cleanupUnsubscribed()))
        };
        const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
        const component = createComponent(couchService, chatService, planetMessageService);
        await expect(component.deleteResource({ _id: 'res1', _rev: '1-a' }).request.toPromise())
          .resolves.toEqual({ id: 'res1' });
        expect(couchService.delete).toHaveBeenCalled();
        expect(planetMessageService.showAlert).not.toHaveBeenCalled();
        expect(cleanupUnsubscribed).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(11001);
        expect(cleanupUnsubscribed).toHaveBeenCalledOnce();
        expect(planetMessageService.showAlert).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not expose structured deferred-cleanup results to the resource UI', async () => {
      const couchService = { delete: vi.fn().mockReturnValue(of({ id: 'res1' })) };
      const chatService = {
        removeResourceIndexes: vi.fn().mockReturnValue(of({
          results: [ { resourceId: 'res1', removed: false, deferred: true } ]
        }))
      };
      const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
      const component = createComponent(couchService, chatService, planetMessageService);

      await component.deleteResource({ _id: 'res1', _rev: '1-a' }).request.toPromise();

      expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    });

    it('uses one cleanup request before bulk deletion regardless of selection size', async () => {
      const couchService = { post: vi.fn().mockReturnValue(of([])) };
      const chatService = { removeResourceIndexes: vi.fn().mockReturnValue(of({ results: [] })) };
      const component = createComponent(couchService, chatService);
      const resources = Array.from({ length: 40 }, (_, index) => ({ _id: `res${index}`, _rev: '1-a' }));

      await component.deleteResources(resources).request.toPromise();

      expect(chatService.removeResourceIndexes).toHaveBeenCalledTimes(1);
      expect(chatService.removeResourceIndexes).toHaveBeenCalledWith(resources.map((resource) => resource._id));
      expect(couchService.post).toHaveBeenCalledTimes(1);
    });

    it('leaves resources beyond the immediate cleanup batch for silent reconciliation', async () => {
      const couchService = { post: vi.fn().mockReturnValue(of([])) };
      const chatService = { removeResourceIndexes: vi.fn().mockReturnValue(of({ results: [] })) };
      const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
      const component = createComponent(couchService, chatService, planetMessageService);
      const resources = Array.from({ length: 501 }, (_, index) => ({ _id: `res${index}`, _rev: '1-a' }));

      await component.deleteResources(resources).request.toPromise();

      expect(chatService.removeResourceIndexes).toHaveBeenCalledTimes(1);
      expect(chatService.removeResourceIndexes.mock.calls[0][0]).toHaveLength(500);
      expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    });

    it('requests cleanup even before provider discovery is available', async () => {
      const couchService = { delete: vi.fn().mockReturnValue(of({ id: 'res1' })) };
      const chatService = {
        hasFileSearchProvider: () => false,
        removeResourceIndexes: vi.fn().mockReturnValue(of({ results: [] }))
      };
      const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
      const component = createComponent(couchService, chatService, planetMessageService);

      await component.deleteResource({ _id: 'res1', _rev: '1-a' }).request.toPromise();

      expect(chatService.removeResourceIndexes).toHaveBeenCalledWith([ 'res1' ]);
      expect(couchService.delete).toHaveBeenCalled();
      expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    });
  });

  describe('deletion results', () => {
    it('removes a successfully deleted resource from the current table', () => {
      const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
      const component = createComponent({}, { hasFileSearchProvider: () => false }, planetMessageService);
      const resource = { _id: 'res1', _rev: '1-a', doc: { title: 'Guide' } };
      component.resources.data = [ resource, { _id: 'res2' } ];
      component.selection.select(resource._id);
      component.deleteDialog = { close: vi.fn() };

      component.deleteResource(resource).onNext({ id: resource._id });

      expect(component.resources.data).toEqual([ { _id: 'res2' } ]);
      expect(component.selection.isSelected(resource._id)).toEqual(false);
      expect(component.deleteDialog.close).toHaveBeenCalled();
      expect(planetMessageService.showMessage).toHaveBeenCalledWith('You have deleted resource: Guide');
    });

    it('refreshes the resource list after a successful bulk deletion', () => {
      const resourcesService = { requestResourcesUpdate: vi.fn() };
      const planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
      const component = createComponent(
        {},
        { hasFileSearchProvider: () => false },
        planetMessageService,
        resourcesService
      );
      const resources = [ { _id: 'res1' }, { _id: 'res2' } ];
      component.selection.select(...resources.map((resource) => resource._id));
      component.deleteDialog = { close: vi.fn() };

      component.deleteResources(resources).onNext([]);

      expect(resourcesService.requestResourcesUpdate).toHaveBeenCalledWith(false);
      expect(component.selection.isEmpty()).toEqual(true);
      expect(component.deleteDialog.close).toHaveBeenCalled();
      expect(planetMessageService.showMessage).toHaveBeenCalledWith('You have deleted 2 resources');
    });
  });
});
