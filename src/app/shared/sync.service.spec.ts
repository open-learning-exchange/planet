import { of } from 'rxjs';
import { vi } from 'vitest';

import { SyncService } from './sync.service';

describe('SyncService', () => {
  it('waits for the complete tags snapshot before creating replicators', () => {
    const stateService = {
      getCouchState: vi.fn().mockReturnValue(of(
        [ { _id: 'tag-1' } ],
        [ { _id: 'tag-1' }, { _id: 'tag-2' } ]
      ))
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
});
