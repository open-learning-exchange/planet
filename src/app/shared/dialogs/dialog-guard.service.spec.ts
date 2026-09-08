import { EMPTY, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from './dialog-guard.service';

describe('DialogGuardService', () => {
  let service: DialogGuardService;

  const createDialogRef = () => {
    const afterClosed$ = new Subject<any>();
    return { afterClosed: () => afterClosed$, close: () => afterClosed$.next(undefined) } as any;
  };

  beforeEach(() => {
    service = new DialogGuardService();
  });

  describe('immediate openings', () => {

    it('opens once and hands duplicate attempts the dialog already open', () => {
      const dialogRef = createDialogRef();
      const work = vi.fn().mockReturnValue(dialogRef);

      expect(service.openNow('delete', work)).toBe(dialogRef);
      expect(service.openNow('delete', work)).toBe(dialogRef);

      expect(work).toHaveBeenCalledTimes(1);
      expect(service.isActive('delete')).toBe(true);
      expect(service.activeRef('delete')).toBe(dialogRef);
    });

    it('releases the key once the dialog closes', () => {
      const dialogRef = createDialogRef();
      const work = vi.fn().mockReturnValue(dialogRef);
      service.openNow('delete', work);

      dialogRef.close();

      expect(service.isActive('delete')).toBe(false);
      expect(service.activeRef('delete')).toBeNull();
      service.openNow('delete', work);
      expect(work).toHaveBeenCalledTimes(2);
    });

    it('releases the key when nothing opens', () => {
      expect(service.openNow('delete', () => null)).toBeNull();

      expect(service.isActive('delete')).toBe(false);
    });

    it('releases the key when opening throws', () => {
      expect(() => service.openNow('delete', () => {
        throw new Error('could not open');
      })).toThrow('could not open');

      expect(service.isActive('delete')).toBe(false);
    });

  });

  describe('openings after asynchronous work', () => {

    it('keeps the key active from the request until the dialog closes', () => {
      const request$ = new Subject<any>();
      const dialogRef = createDialogRef();
      const opened: any[] = [];
      service.open('members', () => request$).subscribe(ref => opened.push(ref));

      expect(service.isActive('members')).toBe(true);

      request$.next(dialogRef);

      expect(opened).toEqual([ dialogRef ]);
      expect(service.isActive('members')).toBe(true);

      dialogRef.close();

      expect(service.isActive('members')).toBe(false);
    });

    it('ignores a duplicate request while the first one is still in flight', () => {
      const request$ = new Subject<any>();
      service.open('members', () => request$).subscribe();
      const duplicateWork = vi.fn();
      const duplicateRefs: any[] = [];

      service.open('members', duplicateWork).subscribe(ref => duplicateRefs.push(ref));

      expect(duplicateWork).not.toHaveBeenCalled();
      expect(duplicateRefs).toEqual([]);
    });

    it('releases the key when the request errors', () => {
      service.open('members', () => throwError(() => new Error('offline'))).subscribe({ error: () => {} });

      expect(service.isActive('members')).toBe(false);
    });

    it('releases the key when the request completes without opening a dialog', () => {
      service.open('members', () => EMPTY).subscribe();

      expect(service.isActive('members')).toBe(false);
    });

  });

  it('tracks keys independently', () => {
    const courseRef = createDialogRef();
    const resourceRef = createDialogRef();

    service.openNow('send-course', () => courseRef);

    expect(service.openNow('send-resource', () => resourceRef)).toBe(resourceRef);
    expect(service.isActive('send-course')).toBe(true);
    expect(service.isActive('send-resource')).toBe(true);
  });

});
