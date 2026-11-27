import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'get': vi.fn(), 'insert': vi.fn(), 'view': vi.fn(), 'findTeams': vi.fn() }));

vi.mock('../../../config/couch.config', () => ({
  'chatDB': { 'get': mocks.get, 'insert': mocks.insert, 'view': mocks.view },
  'teamsDB': { 'find': mocks.findTeams },
  'couchBaseUrl': 'http://couchdb:5984',
  'resourceDB': {}
}));
vi.mock('../../../services/config.service', () => ({ 'getConfiguration': async () => ({ 'code': 'planet-a' }) }));

import { getSharedChat, sharePreviews, shareConversation, stopSharing } from './share.service';

const amara = { 'name': 'amara', 'roles': [ 'learner' ] };
const brian = { 'name': 'brian', 'roles': [ 'learner' ] };
const turns = [
  { 'id': '1', 'query': 'What is a half?', 'response': 'One of two equal parts.' },
  { 'id': '2', 'query': 'And a third?', 'response': 'One of three.' },
  { 'id': '3', 'query': 'Private follow-up', 'response': 'Not shared.' }
];
const conversation = (shares: any[]) => ({
  '_id': 'chat-1', '_rev': '1-a', 'user': 'amara', 'title': 'Fractions', 'createdDate': 1, 'conversations': turns, shares
});
const communityShare = { 'id': 'share-c', 'audience': { 'type': 'community' }, 'turns': 2, 'sharedDate': 5 };
const teamShare = { 'id': 'share-t', 'audience': { 'type': 'team', 'teamId': 'team-1' }, 'sharedDate': 6 };
const viewRows = (doc: any, keys: string[]) => ({ 'rows': keys.map((key) => ({ key, 'id': doc._id, doc })) });

describe('chat shares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue({ 'id': 'chat-1', 'rev': '2-b' });
  });

  it('records how many turns a share keeps, and none for a live share', async () => {
    mocks.get.mockResolvedValue(conversation([]));

    const frozen = await shareConversation('chat-1', amara, { 'type': 'community' }, false);
    const live = await shareConversation('chat-1', amara, { 'type': 'team', 'teamId': 'team-1' }, true);

    expect(frozen).toMatchObject({ 'audience': { 'type': 'community' }, 'turns': 3 });
    expect(live).not.toHaveProperty('turns');
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({
      '_rev': '1-a', 'conversations': turns, 'shares': [ live ]
    }));
  });

  it('lets only the owner share or stop sharing', async () => {
    mocks.get.mockResolvedValue(conversation([ communityShare ]));
    mocks.view.mockResolvedValue(viewRows(conversation([ communityShare ]), [ 'share-c' ]));

    expect(await shareConversation('chat-1', brian, { 'type': 'community' }, false)).toBeUndefined();
    expect(await stopSharing('share-c', brian)).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('stops one share by its id and keeps the others', async () => {
    mocks.view.mockResolvedValueOnce(viewRows(conversation([ communityShare, teamShare ]), [ 'share-c' ]))
      .mockResolvedValueOnce({ 'rows': [] });

    expect(await stopSharing('share-c', amara)).toBe(true);
    expect(await stopSharing('share-missing', amara)).toBe(false);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ 'shares': [ teamShare ], 'conversations': turns }));
  });

  it('answers 503, not "no such share", while the shares view is missing', async () => {
    mocks.view.mockRejectedValueOnce({ 'statusCode': 404 });

    await expect(stopSharing('share-c', amara)).rejects.toMatchObject({ 'statusCode': 503 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('previews only the turns a frozen share keeps, cut short, and leaves unknown ids out', async () => {
    const long = { ...turns[0], 'response': 'x'.repeat(400) };
    const doc = { ...conversation([ communityShare ]), 'conversations': [ long, ...turns.slice(1) ] };
    mocks.view.mockResolvedValue(viewRows(doc, [ 'share-c' ]));

    const previews = await sharePreviews([ 'share-c', 'share-gone' ], brian);

    expect(Object.keys(previews)).toEqual([ 'share-c' ]);
    expect(previews['share-c']).toMatchObject({ 'title': 'Fractions', 'totalTurns': 2, 'live': false, 'sharedDate': 5 });
    expect(previews['share-c'].turns).toHaveLength(2);
    expect(Array.from(previews['share-c'].turns[0].response)).toHaveLength(300);
    expect(JSON.stringify(previews)).not.toContain('Private follow-up');
    expect(mocks.findTeams).not.toHaveBeenCalled();
  });

  it('previews a team share only for the team\'s members on this planet', async () => {
    mocks.view.mockResolvedValue(viewRows(conversation([ teamShare ]), [ 'share-t' ]));
    mocks.findTeams.mockResolvedValueOnce({ 'docs': [ { 'teamId': 'team-1' } ] }).mockResolvedValueOnce({ 'docs': [] });

    expect(await sharePreviews([ 'share-t' ], brian)).toHaveProperty('share-t.live', true);
    expect(await sharePreviews([ 'share-t' ], brian)).toEqual({});
    expect(mocks.findTeams).toHaveBeenCalledWith(expect.objectContaining({
      'selector': { 'docType': 'membership', '$or': [
        { 'userId': 'org.couchdb.user:brian', 'userPlanetCode': 'planet-a' },
        { 'userId': 'org.couchdb.user:brian@planet-a' }
      ] }
    }));
  });

  it('opens every turn a share keeps, uncut, for a reader in its audience', async () => {
    const long = { ...turns[0], 'response': 'x'.repeat(400) };
    const doc = { ...conversation([ communityShare, teamShare ]), 'conversations': [ long, ...turns.slice(1) ] };
    mocks.view.mockImplementation(async (design: string, view: string, { keys }: any) => viewRows(doc, keys));
    mocks.findTeams.mockResolvedValue({ 'docs': [] });

    const opened = await getSharedChat('share-c', brian);

    expect(opened?.turns.map(({ query }) => query)).toEqual([ 'What is a half?', 'And a third?' ]);
    expect(opened?.turns[0].response).toHaveLength(400);
    expect(await getSharedChat('share-t', brian)).toBeUndefined();
  });
});
