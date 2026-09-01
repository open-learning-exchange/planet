import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { RatingService } from './rating.service';

describe('RatingService promptRating', () => {
  const setup = (inShelf = true, dialogResult: any = undefined) => {
    const couch = { updateDocument: vi.fn().mockReturnValue(of({ ok: true })), datePlaceholder: 'DATE' };
    const user = { get: () => ({ _id: 'u-1', name: 'tester' }), countInShelf: () => ({ inShelf }) };
    const state = { configuration: { code: 'c1', parentCode: 'p1', parentDomain: 'dom' } };
    const dialogs = { confirm: vi.fn().mockReturnValue(of(dialogResult)) };
    const msg = { showMessage: vi.fn(), showAlert: vi.fn() };
    const service = new RatingService(couch as any, user as any, state as any, dialogs as any, msg as any);
    return { service, couch, dialogs, msg };
  };

  it('prompts dialog and saves rating when enrolled and unrated', () => {
    const { service, dialogs, couch, msg } = setup(true, { rate: 5, comment: 'Nice' });
    service.promptRating({ _id: 'r-1', title: 'Res' }, 'resource').subscribe(res => expect(res).toBe(true));
    expect(dialogs.confirm).toHaveBeenCalled();
    expect(couch.updateDocument).toHaveBeenCalledWith('ratings', expect.objectContaining({ rate: 5, item: 'r-1' }));
    expect(msg.showMessage).toHaveBeenCalled();
  });

  it('skips prompt when item is already rated or not in shelf', () => {
    const { service, dialogs } = setup(false);
    service.promptRating({ _id: 'r-1' }, 'resource').subscribe(res => expect(res).toBe(true));
    expect(dialogs.confirm).not.toHaveBeenCalled();

    const { service: s2, dialogs: d2 } = setup(true);
    s2.promptRating({ _id: 'r-1', rating: { userRating: { rate: 4 } } }, 'resource').subscribe();
    expect(d2.confirm).not.toHaveBeenCalled();
  });
});
