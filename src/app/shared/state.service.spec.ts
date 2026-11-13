import { StateService } from './state.service';

describe('StateService combineChanges', () => {
  const service = new StateService(null as any);
  const docs = [ { _id: 'a', title: 'A' }, { _id: 'b', title: 'B' }, { _id: 'c', title: 'C' } ];

  it('replaces a changed doc in its position', () => {
    const changed = { _id: 'b', title: 'B2' };
    expect(service.combineChanges(docs, [ changed ], undefined)).toEqual([ docs[0], changed, docs[2] ]);
  });

  it('removes deleted docs and ignores deletions of unknown docs', () => {
    const changes = [ { _id: 'a', _deleted: true }, { _id: 'z', _deleted: true } ];
    expect(service.combineChanges(docs, changes, undefined)).toEqual([ docs[1], docs[2] ]);
  });

  it('appends new docs in change order', () => {
    const changes = [ { _id: 'e', title: 'E' }, { _id: 'd', title: 'D' } ];
    expect(service.combineChanges(docs, changes, undefined)).toEqual([ ...docs, ...changes ]);
  });

  it('sorts the merged list when a sort is given', () => {
    const changes = [ { _id: 'd', title: 'aa' } ];
    expect(service.combineChanges(docs, changes, { title: 'asc' }).map(doc => doc._id)).toEqual([ 'a', 'd', 'b', 'c' ]);
  });

  it('moves a changed doc to its new sorted place', () => {
    const changes = [ { _id: 'a', title: 'D' } ];
    expect(service.combineChanges(docs, changes, { title: 'asc' }).map(doc => doc._id)).toEqual([ 'b', 'c', 'a' ]);
  });

  it('leaves the first page in the order it arrived', () => {
    const page = [ { _id: 'b', title: 'B' }, { _id: 'a', title: 'A' } ];
    expect(service.combineChanges([], page, { title: 'asc' })).toEqual(page);
  });
});
