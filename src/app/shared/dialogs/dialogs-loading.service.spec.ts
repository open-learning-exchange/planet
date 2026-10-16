import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { DialogsLoadingService } from './dialogs-loading.service';

describe('DialogsLoadingService', () => {
  it('opens the overlay again after navigation closed it mid-request', () => {
    const closes: Subject<void>[] = [];
    const dialog = {
      open: vi.fn(() => {
        const closed = new Subject<void>();
        closes.push(closed);
        return { afterClosed: () => closed, close: () => closed.next() };
      })
    } as any;
    const service = new DialogsLoadingService(dialog);

    service.start();
    closes[0].next();
    service.start();
    service.stop();

    expect(dialog.open).toHaveBeenCalledTimes(2);
    expect(service.isSpinnerOn).toBe(false);
  });
});
