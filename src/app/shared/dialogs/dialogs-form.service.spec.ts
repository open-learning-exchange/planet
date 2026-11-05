import { MatDialogState } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DialogsFormService } from './dialogs-form.service';

describe('DialogsFormService confirm', () => {
  const setup = () => {
    const afterClosed = new Subject<any>();
    const dialogRef = {
      state: MatDialogState.OPEN,
      afterClosed: () => afterClosed,
      getState: () => dialogRef.state,
      close: vi.fn()
    };
    const service = new DialogsFormService({ open: vi.fn(() => dialogRef) } as any);
    return { service, dialogRef, afterClosed };
  };

  it('closes its own dialog when the subscriber unsubscribes while it is open', () => {
    const { service, dialogRef } = setup();

    service.confirm('Title', [], {}).subscribe().unsubscribe();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });

  it('leaves a dialog that already closed alone', () => {
    const { service, dialogRef, afterClosed } = setup();
    const results: any[] = [];
    service.confirm('Title', [], {}).subscribe(result => results.push(result));

    dialogRef.state = MatDialogState.CLOSED;
    afterClosed.next({ name: 'value' });
    afterClosed.complete();

    expect(results).toEqual([ { name: 'value' } ]);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});

describe('DialogsFormService showErrorMessage', () => {
  const service = new DialogsFormService({} as any);

  it('shows the error on the form it was given', () => {
    const dialogRef = { componentInstance: { errorMessage: '' } };

    service.showErrorMessage(dialogRef as any, 'Save failed');

    expect(dialogRef.componentInstance.errorMessage).toBe('Save failed');
  });

  it('ignores a form that has already closed', () => {
    expect(() => service.showErrorMessage({ componentInstance: null } as any, 'Save failed')).not.toThrow();
  });
});
