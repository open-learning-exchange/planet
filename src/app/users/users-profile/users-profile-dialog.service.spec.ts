import { vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { UserProfileDialogComponent } from './users-profile-dialog.component';
import { UsersProfileDialogService } from './users-profile-dialog.service';

describe('UsersProfileDialogService', () => {
  let service: UsersProfileDialogService;
  let dialog: { open: ReturnType<typeof vi.fn> };

  const configOf = () => dialog.open.mock.calls[0][1];

  beforeEach(() => {
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: vi.fn() }) };
    service = new UsersProfileDialogService(dialog as any as MatDialog);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the profile dialog component', () => {
    service.open({ member: { name: 'ann' } });

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open.mock.calls[0][0]).toBe(UserProfileDialogComponent);
  });

  // The reason this service exists: Material defaults autoFocus to 'first-tabbable', which
  // focuses an element below the fold and makes the browser scroll the dialog past its
  // header. 'dialog' focuses the container instead. Callers used to set this individually
  // and three of eight had missed it.
  it('focuses the dialog container rather than the first tabbable element', () => {
    service.open({ member: { name: 'ann' } });

    expect(configOf().autoFocus).toBe('dialog');
  });

  it('caps the dialog to the viewport', () => {
    service.open({ member: { name: 'ann' } });

    expect(configOf()).toMatchObject({ maxWidth: '90vw', maxHeight: '90vh' });
  });

  it('passes the member through untouched', () => {
    const member = { name: 'ann', userPlanetCode: 'kal' };

    service.open({ member });

    expect(configOf().data).toEqual({ member });
  });

  it('forwards an optional dialogRef, which meetups uses to close itself', () => {
    const dialogRef = { close: vi.fn() } as any;

    service.open({ member: { name: 'ann' }, dialogRef });

    expect(configOf().data.dialogRef).toBe(dialogRef);
  });

  it('lets a caller add config the defaults do not cover', () => {
    service.open({ member: { name: 'ann' } }, { restoreFocus: false });

    expect(configOf().restoreFocus).toBe(false);
    expect(configOf().autoFocus).toBe('dialog');
  });

  it('lets a caller override a default', () => {
    service.open({ member: { name: 'ann' } }, { maxWidth: '400px' });

    expect(configOf().maxWidth).toBe('400px');
    expect(configOf().maxHeight).toBe('90vh');
  });

  it('does not let config replace the member data', () => {
    const member = { name: 'ann' };

    service.open({ member }, { data: { member: { name: 'imposter' } } } as any);

    expect(configOf().data).toEqual({ member });
  });

  it('returns the dialog ref so callers can await the result', () => {
    const ref = { afterClosed: vi.fn() };
    dialog.open.mockReturnValue(ref);

    expect(service.open({ member: { name: 'ann' } })).toBe(ref);
  });
});
