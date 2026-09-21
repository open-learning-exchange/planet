import { of } from 'rxjs';
import { vi } from 'vitest';

import { SyncService } from './sync.service';

describe('SyncService', () => {
  it('waits for the complete tags snapshot before creating replicators', () => {
    const stateService = {
      getCouchState: vi.fn().mockReturnValue(of(
        [ { _id: 'tag-1' } ],
        [ { _id: 'tag-1' }, { _id: 'tag-2' } ]
      )),
      isCouchStateComplete: vi.fn().mockReturnValue(true)
    };
    const service = new SyncService(
      {} as any,
      stateService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    const createReplicators = vi.spyOn(service, 'createReplicatorsArray').mockReturnValue([]);

    service.replicatorsArrayWithTags([], 'pull', 'parent').subscribe();

    expect(createReplicators).toHaveBeenCalledWith(
      [],
      'pull',
      [ { _id: 'tag-1' }, { _id: 'tag-2' } ]
    );
  });

  it('does not create replicators from an incomplete tags snapshot', () => {
    const stateService = {
      getCouchState: vi.fn().mockReturnValue(of([ { _id: 'tag-1' } ])),
      isCouchStateComplete: vi.fn().mockReturnValue(false)
    };
    const service = new SyncService(
      {} as any,
      stateService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    const createReplicators = vi.spyOn(service, 'createReplicatorsArray');
    let error;

    service.replicatorsArrayWithTags([], 'pull', 'parent').subscribe({ error: (err) => error = err });

    expect(createReplicators).not.toHaveBeenCalled();
    expect(error).toEqual({ status: 0, error: { reason: 'There was an error connecting to Planet' } });
  });
});
