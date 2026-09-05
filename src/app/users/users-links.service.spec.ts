import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { UsersLinksService } from './users-links.service';

describe('UsersLinksService', () => {
  let service: UsersLinksService;
  let dialog: { open: ReturnType<typeof vi.fn> };
  let couchService: { get: ReturnType<typeof vi.fn> };
  let userService: { updateUser: ReturnType<typeof vi.fn> };
  let planetMessageService: { showMessage: ReturnType<typeof vi.fn>, showAlert: ReturnType<typeof vi.fn> };
  let dialogsLoadingService: { start: ReturnType<typeof vi.fn>, stop: ReturnType<typeof vi.fn> };

  const websiteLink = { platform: 'website', url: 'https://ole.org/', label: '' };
  // Credential fields the profile view strips before it hands a doc to a caller.
  const userDoc = { _id: 'org.couchdb.user:ann', _rev: '3-abc', name: 'ann', roles: [], derived_key: 'key' };

  const openWith = (closedValue) => {
    dialog.open.mockReturnValue({ afterClosed: () => of(closedValue) });
  };

  beforeEach(() => {
    dialog = { open: vi.fn() };
    couchService = { get: vi.fn(() => of(userDoc)) };
    userService = { updateUser: vi.fn(() => of({ ok: true })) };
    planetMessageService = { showMessage: vi.fn(), showAlert: vi.fn() };
    dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    service = new UsersLinksService(
      dialog as any as MatDialog,
      couchService as any as CouchService,
      userService as any as UserService,
      planetMessageService as any as PlanetMessageService,
      dialogsLoadingService as any as DialogsLoadingService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not write when the dialog is cancelled', () => {
    openWith(undefined);
    const next = vi.fn();

    service.openDialog('ann', [ websiteLink ]).subscribe(next);

    expect(userService.updateUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  // Opening the editor and pressing OK without touching anything should not touch the doc.
  it('does not write when the links come back unchanged', () => {
    openWith([ websiteLink ]);

    service.openDialog('ann', [ websiteLink ]).subscribe();

    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  // The caller's copy of the doc can be stale or stripped of credentials, and updateUser
  // backfills missing credential fields from the logged in user.
  it('re-reads the user doc and writes the links onto it', () => {
    openWith([ websiteLink ]);
    const next = vi.fn();

    service.openDialog('ann', []).subscribe(next);

    expect(couchService.get).toHaveBeenCalledWith('_users/org.couchdb.user:ann');
    expect(userService.updateUser).toHaveBeenCalledWith({ ...userDoc, socialLinks: [ websiteLink ] });
    expect(next).toHaveBeenCalledWith([ websiteLink ]);
    expect(planetMessageService.showMessage).toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
  });

  it('alerts and emits nothing when the write fails', () => {
    userService.updateUser.mockReturnValue(throwError(() => new Error('conflict')));
    const next = vi.fn();

    service.updateLinks('ann', [ websiteLink ]).subscribe(next);

    expect(planetMessageService.showAlert).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
  });

});
