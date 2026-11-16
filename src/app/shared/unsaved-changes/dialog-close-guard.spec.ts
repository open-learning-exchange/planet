import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { guardDialogClose, heldOpenDialogs } from './dialog-close-guard';

describe('guardDialogClose', () => {
  const setup = (hasChanges: boolean, confirmed = true) => {
    const keydown = new Subject<KeyboardEvent>();
    const backdrop = new Subject<MouseEvent>();
    const dialogRef = {
      disableClose: false,
      close: vi.fn(),
      keydownEvents: () => keydown,
      backdropClick: () => backdrop
    } as any;
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(confirmed) })) } as any;
    guardDialogClose(dialogRef, dialog, () => hasChanges);
    const escape = () => keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));
    return { dialogRef, dialog, escape, backdrop };
  };

  it('closes an unchanged dialog on Escape or a backdrop click without asking', () => {
    const { dialogRef, dialog, escape, backdrop } = setup(false);

    expect(dialogRef.disableClose).toBe(true);
    escape();
    backdrop.next(new MouseEvent('click'));

    expect(dialog.open).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledTimes(2);
  });

  it.each([ true, false ])('asks before closing a changed dialog and closes only when confirmed (%s)', confirmed => {
    const { dialogRef, dialog, escape } = setup(true, confirmed);

    escape();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledTimes(confirmed ? 1 : 0);
  });

  it('ignores the Escape that leaves a fullscreen editor, and asks on the next one', () => {
    const { dialogRef, dialog, escape } = setup(true);

    heldOpenDialogs.add(dialogRef);
    escape();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();

    heldOpenDialogs.delete(dialogRef);
    escape();
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });
});
