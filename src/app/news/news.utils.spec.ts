import {
  getReactionEntries, hasUserReacted, parseReactions, toggleNewsReaction
} from './news.utils';

describe('news reactions utilities', () => {
  it('parses reactions from object, JSON string, and null/undefined fallbacks', () => {
    expect(parseReactions(null)).toEqual({});
    expect(parseReactions(undefined)).toEqual({});
    expect(parseReactions('invalid-json')).toEqual({});
    expect(parseReactions([])).toEqual({});
    expect(parseReactions('[1, 2, 3]')).toEqual({});
    expect(parseReactions('{"👍":["user-1"]}')).toEqual({ '👍': [ 'user-1' ] });
    expect(parseReactions({ '❤️': [ 'user-2' ] })).toEqual({ '❤️': [ 'user-2' ] });
  });

  it('determines if a user has reacted with a specific emoji', () => {
    const reactions = { '👍': [ 'user-1', 'user-2' ], '❤️': [ 'user-3' ] };
    expect(hasUserReacted(reactions, '👍', 'user-1')).toBe(true);
    expect(hasUserReacted(reactions, '👍', 'user-3')).toBe(false);
    expect(hasUserReacted(reactions, '❤️', 'user-3')).toBe(true);
    expect(hasUserReacted(reactions, '😂', 'user-1')).toBe(false);
    expect(hasUserReacted(reactions, '👍', undefined)).toBe(false);
  });

  it('adds a reaction when the user has not yet reacted', () => {
    const initial = {};
    const updated = toggleNewsReaction(initial, '👍', 'user-1');
    expect(updated).toEqual({ '👍': [ 'user-1' ] });
  });

  it('removes an existing reaction when clicked again (toggle off)', () => {
    const initial = { '👍': [ 'user-1', 'user-2' ] };
    const updated = toggleNewsReaction(initial, '👍', 'user-1');
    expect(updated).toEqual({ '👍': [ 'user-2' ] });

    const final = toggleNewsReaction(updated, '👍', 'user-2');
    expect(final).toEqual({});
  });

  it('replaces a prior reaction when the user picks a different emoji', () => {
    const initial = { '👍': [ 'user-1', 'user-2' ], '❤️': [ 'user-3' ] };
    const updated = toggleNewsReaction(initial, '❤️', 'user-1');
    expect(updated).toEqual({
      '👍': [ 'user-2' ],
      '❤️': [ 'user-3', 'user-1' ]
    });
  });

  it('cleans up empty keys when switching emoji removes the only reaction', () => {
    const initial = { '👍': [ 'user-1' ] };
    const updated = toggleNewsReaction(initial, '🔥', 'user-1');
    expect(updated).toEqual({ '🔥': [ 'user-1' ] });
    expect(updated['👍']).toBeUndefined();
  });

  it('formats reaction entries with count and users', () => {
    const reactions = {
      '👍': [ 'user-1', 'user-2' ],
      '❤️': [ 'user-3' ],
      empty: []
    };
    expect(getReactionEntries(reactions)).toEqual([
      { emoji: '👍', count: 2, users: [ 'user-1', 'user-2' ] },
      { emoji: '❤️', count: 1, users: [ 'user-3' ] }
    ]);
  });
});
