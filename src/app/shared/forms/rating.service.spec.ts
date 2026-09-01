import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { RatingService } from './rating.service';

describe('RatingService promptRating', () => {
  const setup = (options: { inShelf?: boolean; existingRate?: number; dialogResult?: any } = {}) => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn().mockReturnValue(of({ ok: true })),
      datePlaceholder: 'DATE'
    };
    const userService = {
      get: vi.fn().mockReturnValue({ _id: 'u-1', name: 'tester' }),
      countInShelf: vi.fn().mockReturnValue({ inShelf: options.inShelf ?? true })
    };
    const stateService = {
      configuration: { code: 'c1', parentCode: 'p1', parentDomain: 'parent.dom' }
    };
    const dialogsFormService = {
      confirm: vi.fn().mockReturnValue(of(options.dialogResult))
    };
    const planetMessageService = {
      showMessage: vi.fn(),
      showAlert: vi.fn()
    };

    const service = new RatingService(
      couchService as any,
      userService as any,
      stateService as any,
      dialogsFormService as any,
      planetMessageService as any
    );

    return { service, couchService, dialogsFormService, planetMessageService };
  };

  it('skips prompt when item is not in user shelf', () => {
    const { service, dialogsFormService } = setup({ inShelf: false });
    const item = { _id: 'r-1' };

    let completed = false;
    service.promptRating(item, 'resource').subscribe(res => {
      expect(res).toBe(true);
      completed = true;
    });

    expect(completed).toBe(true);
    expect(dialogsFormService.confirm).not.toHaveBeenCalled();
  });

  it('skips prompt when item is already rated by the user', () => {
    const { service, dialogsFormService } = setup({ inShelf: true });
    const item = { _id: 'r-1', rating: { userRating: { rate: 4 } } };

    let completed = false;
    service.promptRating(item, 'resource').subscribe(res => {
      expect(res).toBe(true);
      completed = true;
    });

    expect(completed).toBe(true);
    expect(dialogsFormService.confirm).not.toHaveBeenCalled();
  });

  it('prompts dialog and saves rating when enrolled and unrated', () => {
    const { service, dialogsFormService, couchService, planetMessageService } = setup({
      inShelf: true,
      dialogResult: { rate: 5, comment: 'Great resource!' }
    });
    const item = { _id: 'r-1', title: 'Test Resource' };

    let completed = false;
    service.promptRating(item, 'resource').subscribe(res => {
      expect(res).toBe(true);
      completed = true;
    });

    expect(completed).toBe(true);
    expect(dialogsFormService.confirm).toHaveBeenCalled();
    expect(couchService.updateDocument).toHaveBeenCalledWith(
      'ratings',
      expect.objectContaining({
        type: 'resource',
        item: 'r-1',
        title: 'Test Resource',
        rate: 5,
        comment: 'Great resource!'
      })
    );
    expect(planetMessageService.showMessage).toHaveBeenCalled();
  });

  it('returns true and does not save if user dismisses dialog without rating', () => {
    const { service, dialogsFormService, couchService } = setup({
      inShelf: true,
      dialogResult: undefined
    });
    const item = { _id: 'r-1' };

    let completed = false;
    service.promptRating(item, 'resource').subscribe(res => {
      expect(res).toBe(true);
      completed = true;
    });

    expect(completed).toBe(true);
    expect(dialogsFormService.confirm).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });
});
