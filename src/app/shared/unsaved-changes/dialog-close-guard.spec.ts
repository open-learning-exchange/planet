import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { guardDialogClose, heldOpenDialogs } from './dialog-close-guard';

describe('guardDialogClose', () => {
  const setup = (hasChanges: boolean, confirmed = true, onEscape?: () => void) => {
    const keydown = new Subject<KeyboardEvent>();
    const backdrop = new Subject<MouseEvent>();
    const dialogRef = {
      disableClose: false,
      close: vi.fn(),
      keydownEvents: () => keydown,
      backdropClick: () => backdrop
    } as any;
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(confirmed) })) } as any;
    guardDialogClose(dialogRef, dialog, () => hasChanges, onEscape);
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

  it('hands Escape to its own handler, still skipping the held Escape, while the backdrop still closes', () => {
    const onEscape = vi.fn();
    const { dialogRef, escape, backdrop } = setup(false, true, onEscape);

    heldOpenDialogs.add(dialogRef);
    escape();
    heldOpenDialogs.delete(dialogRef);
    escape();
    backdrop.next(new MouseEvent('click'));

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });
});
