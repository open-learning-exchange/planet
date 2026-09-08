import { MatDialog } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PlanetMessageService } from '../planet-message.service';
import { DialogGuardService } from './dialog-guard.service';
import { DialogsPromptComponent } from './dialogs-prompt.component';
import { DialogsPromptService } from './dialogs-prompt.service';

describe('DialogsPromptService', () => {
  let dialog: { open: ReturnType<typeof vi.fn> };
  let planetMessageService: { showMessage: ReturnType<typeof vi.fn>, showAlert: ReturnType<typeof vi.fn> };
  let openedRefs: any[];
  let service: DialogsPromptService;

  const promptData = () => dialog.open.mock.calls[dialog.open.mock.calls.length - 1][1].data;
  const clickOk = () => {
    const { okClick } = promptData();
    okClick.request.subscribe({ next: okClick.onNext, error: okClick.onError });
  };

  beforeEach(() => {
    openedRefs = [];
    dialog = {
      open: vi.fn(() => {
        const afterClosed$ = new Subject<any>();
        const dialogRef = {
          close: vi.fn((result?: any) => afterClosed$.next(result)),
          afterClosed: () => afterClosed$
        };
        openedRefs.push(dialogRef);
        return dialogRef;
      })
    };
    planetMessageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    service = new DialogsPromptService(
      dialog as unknown as MatDialog,
      new DialogGuardService(),
      planetMessageService as unknown as PlanetMessageService
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('passes the prompt content through to DialogsPromptComponent', () => {
    service.open({ changeType: 'delete', type: 'course', amount: 'many', count: 3, displayName: 'Course' });

    expect(dialog.open).toHaveBeenCalledWith(DialogsPromptComponent, expect.objectContaining({
      data: expect.objectContaining({ changeType: 'delete', type: 'course', amount: 'many', count: 3, displayName: 'Course' })
    }));
  });

  describe('local confirmations', () => {

    it('runs without a loading spinner and closes on confirmation', () => {
      const onSuccess = vi.fn();

      service.open({ changeType: 'delete', type: 'course', onSuccess });

      expect(promptData().spinnerOn).toBe(false);
      expect(onSuccess).not.toHaveBeenCalled();

      clickOk();

      expect(onSuccess).toHaveBeenCalled();
      expect(openedRefs[0].close).toHaveBeenCalledWith(true);
    });

    it('leaves the confirmed action unrun when the prompt is cancelled', () => {
      const onSuccess = vi.fn();
      service.open({ changeType: 'delete', type: 'course', onSuccess });

      openedRefs[0].close();

      expect(onSuccess).not.toHaveBeenCalled();
    });

  });

  describe('observable-backed operations', () => {

    it('keeps the loading spinner on by default', () => {
      service.open({ request: () => of('done') });

      expect(promptData().spinnerOn).toBe(true);
    });

    it('honours an explicit spinner override', () => {
      service.open({ request: () => of('done'), spinnerOn: false });

      expect(promptData().spinnerOn).toBe(false);
    });

    it('defers a request given as a function until OK is clicked', () => {
      const request = vi.fn(() => of('done'));

      service.open({ request });

      expect(request).not.toHaveBeenCalled();

      clickOk();

      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports success, then closes the prompt', () => {
      const onSuccess = vi.fn();
      service.open({ request: () => of('deleted'), onSuccess, successMessage: 'Course deleted' });

      clickOk();

      expect(onSuccess).toHaveBeenCalledWith('deleted');
      expect(planetMessageService.showMessage).toHaveBeenCalledWith('Course deleted');
      expect(openedRefs[0].close).toHaveBeenCalledWith(true);
    });

    it('builds the success message from the result', () => {
      service.open({ request: () => of('Request sent'), successMessage: (result: string) => result });

      clickOk();

      expect(planetMessageService.showMessage).toHaveBeenCalledWith('Request sent');
    });

    it('alerts and leaves the prompt open when the operation fails', () => {
      const onError = vi.fn();
      service.open({ request: () => throwError(() => new Error('offline')), onError, errorMessage: 'There was a problem.' });

      clickOk();

      expect(onError).toHaveBeenCalled();
      expect(planetMessageService.showAlert).toHaveBeenCalledWith('There was a problem.');
      expect(openedRefs[0].close).not.toHaveBeenCalled();
    });

    it('closes the prompt on failure when asked to', () => {
      service.open({ request: () => throwError(() => new Error('offline')), closeOnError: true });

      clickOk();

      expect(openedRefs[0].close).toHaveBeenCalledWith(false);
    });

  });

  describe('duplicate protection', () => {

    it('ignores a second prompt for the same key until the first one closes', () => {
      const first = service.open({ key: 'delete:course', changeType: 'delete', type: 'course' });

      expect(service.open({ key: 'delete:course', changeType: 'delete', type: 'course' })).toBe(first);
      expect(dialog.open).toHaveBeenCalledTimes(1);

      openedRefs[0].close();
      service.open({ key: 'delete:course', changeType: 'delete', type: 'course' });

      expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('opens prompts with different keys independently', () => {
      service.open({ key: 'delete:course', changeType: 'delete', type: 'course' });
      service.open({ key: 'delete:resource', changeType: 'delete', type: 'resource' });

      expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('does not deduplicate prompts opened without a key', () => {
      service.open({ changeType: 'delete', type: 'course' });
      service.open({ changeType: 'delete', type: 'course' });

      expect(dialog.open).toHaveBeenCalledTimes(2);
    });

  });

  describe('confirm', () => {

    it('resolves with the dialog result', () => {
      const results: any[] = [];
      service.confirm({ changeType: 'delete', type: 'course' }).subscribe(result => results.push(result));

      clickOk();

      expect(results).toEqual([ true ]);
    });

    it('completes without a result when a keyed prompt is already open', () => {
      const results: any[] = [];
      service.confirm({ key: 'delete:course', changeType: 'delete', type: 'course' }).subscribe();

      service.confirm({ key: 'delete:course', changeType: 'delete', type: 'course' }).subscribe(result => results.push(result));

      expect(results).toEqual([]);
    });

    it('prompts about unsaved changes with a cancellable exit prompt', () => {
      service.confirmUnsavedChanges({ type: 'survey', extraMessage: 'Your progress will be saved.' }).subscribe();

      expect(promptData()).toEqual(expect.objectContaining({
        changeType: 'exit',
        type: 'survey',
        cancelable: true,
        extraMessage: 'Your progress will be saved.'
      }));
    });

  });

});
