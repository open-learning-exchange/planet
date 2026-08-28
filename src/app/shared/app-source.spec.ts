import { appSourceLabel, appSourceOf, appSourceSelector, isFromAppSource } from './app-source';

describe('app source utilities', () => {

  it('classifies docs without an androidId as planet', () => {
    expect(appSourceOf({ user: 'sam' })).toBe('planet');
    expect(appSourceOf({})).toBe('planet');
    expect(appSourceOf(undefined)).toBe('planet');
  });

  it('classifies legacy android docs as myplanet', () => {
    expect(appSourceOf({ androidId: 'abc_TQ3A', deviceName: 'SAMSUNG SM-A125F' })).toBe('myplanet');
    expect(appSourceOf({ androidId: null })).toBe('myplanet');
  });

  it('prefers the app field the app declares over the androidId heuristic', () => {
    expect(appSourceOf({ app: 'myplanet-lite', androidId: 'abc' })).toBe('myplanet-lite');
    expect(appSourceOf({ app: 'myplanet', androidId: 'abc' })).toBe('myplanet');
    expect(appSourceOf({ app: 'planet' })).toBe('planet');
  });

  it('falls back to the androidId heuristic for an unrecognized app field', () => {
    expect(appSourceOf({ app: 'myplanet-nano', androidId: 'abc' })).toBe('myplanet');
    expect(appSourceOf({ app: '' })).toBe('planet');
  });

  it('labels each app source', () => {
    expect(appSourceLabel({})).toBe('Planet');
    expect(appSourceLabel({ androidId: 'abc' })).toBe('myPlanet');
    expect(appSourceLabel({ app: 'myplanet-lite' })).toBe('myPlanet Lite');
  });

  it('matches every source when the filter is empty', () => {
    expect(isFromAppSource({ app: 'myplanet-lite' }, '')).toBe(true);
    expect(isFromAppSource({}, '')).toBe(true);
  });

  it('builds a mango selector that keeps myplanet-lite out of the myplanet bucket', () => {
    expect(appSourceSelector('planet')).toEqual({ androidId: { $exists: false } });
    expect(appSourceSelector('myplanet')).toEqual({ androidId: { $exists: true }, app: { $ne: 'myplanet-lite' } });
    expect(appSourceSelector('myplanet-lite')).toEqual({ app: 'myplanet-lite' });
    expect(appSourceSelector('')).toEqual({});
    expect(appSourceSelector(undefined)).toEqual({});
  });

  it('keeps myplanet-lite docs out of the myplanet bucket', () => {
    const liteDoc = { app: 'myplanet-lite', androidId: 'abc' };
    expect(isFromAppSource(liteDoc, 'myplanet')).toBe(false);
    expect(isFromAppSource(liteDoc, 'myplanet-lite')).toBe(true);
    expect(isFromAppSource({ androidId: 'abc' }, 'myplanet-lite')).toBe(false);
  });

});
