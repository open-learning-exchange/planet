import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { NewsListComponent } from './news-list.component';

const createComponent = (items: any[] = []) => {
  const component = Object.create(NewsListComponent.prototype) as any;
  component.items = items;
  component.filteredItems = items;
  component.itemsById = new Map<string, any>(items.map(item => [ item._id, item ]));
  component.availableLabels = [];
  component.selectedLabel = '';
  component.messageSearch = '';
  component.messageSearch$ = new Subject<string>();
  component.viewableBy = 'community';
  component.replyViewing = { _id: 'root' };
  component.replyObject = {};
  component.displayedItems = [];
  component.pageIndex = 0;
  component.pageSize = 10;
  component.pageEnd = { root: 10 };
  component.viewChange = { emit: vi.fn() };
  component.unreadReplyIds = new Set<string>();
  component.userService = { notificationStateChange$: new Subject<void>(), userChange$: new Subject<void>() };
  component.notificationsService = {
    getUnreadReplyIds$: vi.fn().mockReturnValue(of([])),
    markReplyNotificationsAsRead: vi.fn()
  };
  component.newsService = { postSharedWithCommunity: () => true, requestNews: vi.fn() };
  return component;
};

describe('NewsListComponent labels', () => {
  it('handles label removal from a legacy post without a labels array', () => {
    const component = createComponent();
    component.newsService = { postNews: vi.fn().mockReturnValue(of({})) };
    const news = { _id: 'news-1' };

    component.changeLabels({ news, label: 'Event', action: 'remove' });

    expect(component.newsService.postNews).toHaveBeenCalledWith(
      { ...news, labels: [] },
      'Label removed'
    );
  });

  it('collects labels from posts and leaves out the feed viewing them', () => {
    const component = createComponent();
    component.viewableId = 'team-1';

    const labels = component.getAvailableLabels([
      { doc: { labels: [ 'Frontend', 'Bug' ] } },
      { doc: { viewIn: [ { _id: 'team-1', name: 'Our Team' }, { _id: 'team-2', name: 'Leadership' } ] } },
      { doc: { chat: true } }
    ]);

    expect(labels).toContain('Frontend');
    expect(labels).toContain('Bug');
    expect(labels).toContain('Leadership');
    expect(labels).toContain('shared chat');
    expect(labels).not.toContain('Our Team');
  });

  it('precomputes group label names for case-insensitive icon lookup', () => {
    const component = createComponent();
    component.getAvailableLabels([ { doc: { labels: [], viewIn: [ { name: 'Team Events' } ] } } ]);

    expect(component.getLabelIcon('team events')).toBe('groups');
    expect(component.getLabelIcon('shared chat')).toBe('question_answer');
    expect(component.getLabelIcon('Frontend')).toBe('label_important');
  });

  it('selects a label from a post chip and clears it when that label is removed', () => {
    const component = createComponent([
      { _id: 'a', doc: { message: 'Need help with CSS', labels: [ 'help' ] } },
      { _id: 'b', doc: { message: 'Frontend refactor', labels: [ 'frontend' ] } }
    ]);
    component.availableLabels = [ 'help', 'frontend' ];
    component.readOnly = true;

    component.changeLabels({ news: {}, label: 'help', action: 'select' });

    expect(component.selectedLabel).toBe('help');
    expect(component.filteredItems.length).toBe(1);

    component.changeLabels({ news: {}, label: 'help', action: 'remove' });

    expect(component.selectedLabel).toBe('');
    expect(component.filteredItems.length).toBe(2);
  });

  it('keeps the filter when an unrelated label is edited', () => {
    const component = createComponent([
      { _id: 'a', doc: { message: 'Need help with CSS', labels: [ 'help' ] } },
      { _id: 'b', doc: { message: 'Frontend refactor', labels: [ 'frontend' ] } }
    ]);
    component.availableLabels = [ 'help', 'frontend' ];
    component.readOnly = true;
    component.changeLabels({ news: {}, label: 'help', action: 'select' });

    component.changeLabels({ news: {}, label: 'frontend', action: 'remove' });

    expect(component.selectedLabel).toBe('help');
    expect(component.filteredItems.length).toBe(1);
  });

  it('filters malformed labels without crashing', () => {
    const component = createComponent([ { _id: 'a', doc: { message: '', labels: [ null, 42, 'Event' ], viewIn: [] } } ]);
    component.selectedLabel = 'event';

    component.applyFilters();

    expect(component.filteredItems).toEqual(component.items);
  });
});

describe('NewsListComponent filtering', () => {
  const thread = () => ([
    { _id: 'root-1', doc: { message: 'Weekly sprint planning' } },
    { _id: 'reply-1', doc: { message: 'I will bring the budget notes', replyTo: 'root-1' } },
    { _id: 'root-2', doc: { message: 'Lunch break discussion' } }
  ]);

  it('matches messages case-insensitively', () => {
    const component = createComponent(thread());
    component.messageSearch = 'SPRINT';

    component.applyFilters();

    expect(component.filteredItems.map(item => item._id)).toEqual([ 'root-1', 'reply-1' ]);
  });

  it('keeps a matching post whole conversation so replies stay reachable', () => {
    const component = createComponent(thread());
    component.messageSearch = 'planning';

    component.applyFilters();

    expect(component.replyObject['root-1'].length).toBe(1);
  });

  it('keeps the root of a matching reply so the thread can be opened', () => {
    const component = createComponent(thread());
    component.messageSearch = 'budget';

    component.applyFilters();

    expect(component.filteredItems.map(item => item._id)).toEqual([ 'root-1', 'reply-1' ]);
  });

  it('climbs nested replies to keep the whole conversation', () => {
    const component = createComponent([
      { _id: 'root-1', doc: { message: 'Weekly sprint planning' } },
      { _id: 'reply-1', doc: { message: 'Notes attached', replyTo: 'root-1' } },
      { _id: 'reply-2', doc: { message: 'the budget line is wrong', replyTo: 'reply-1' } }
    ]);
    component.messageSearch = 'budget';

    component.applyFilters();

    expect(component.filteredItems.map(item => item._id)).toEqual([ 'root-1', 'reply-1', 'reply-2' ]);
  });

  it('does not hang on a reply that points back at itself', () => {
    const component = createComponent([ ...thread(), { _id: 'loop', doc: { message: 'Looping reply', replyTo: 'loop' } } ]);
    component.messageSearch = 'sprint';

    component.applyFilters();

    expect(component.filteredItems.map(item => item._id)).toEqual([ 'root-1', 'reply-1' ]);
  });

  it('restores the feed as soon as the search is cleared', () => {
    const component = createComponent(thread());
    component.messageSearch = 'sprint';
    component.applyFilters();

    component.clearSearch();

    expect(component.filteredItems.length).toBe(3);
  });

  it('leaves the searched posts unchanged', () => {
    const items = thread();
    const component = createComponent(items);
    component.messageSearch = 'sprint';

    component.applyFilters();

    expect(Object.keys(items[0].doc)).toEqual([ 'message' ]);
  });

  it('explains an empty feed caused by the filters', () => {
    const component = createComponent(thread());

    expect(component.emptyStateLabel).toBe('No Voices available.');

    component.messageSearch = 'nothing matches this';

    expect(component.emptyStateLabel).toBe('No Voices match your filters.');
  });

  it('marks only the newest visible root as the latest message', () => {
    const items = thread();
    const component = createComponent(items);
    component.messageSearch = 'lunch';

    component.applyFilters();

    expect(items[2].latestMessage).toBe(true);

    component.messageSearch = '';
    component.applyFilters();

    expect(items[0].latestMessage).toBe(true);
    expect(items[2].latestMessage).toBe(false);
  });

  it('returns to the main conversation when the open thread is filtered away', () => {
    const items = thread();
    const component = createComponent(items);
    component.useReplyRoutes = true;
    component.router = { navigate: vi.fn() };
    component.replyViewing = items[0];
    component.messageSearch = 'lunch';

    component.applyFilters();

    expect(component.replyViewing._id).toBe('root');
    expect(component.viewChange.emit).toHaveBeenCalledWith({ _id: 'root' });
    expect(component.router.navigate).toHaveBeenCalledWith([ '' ]);
  });

  it('clears the filters when a link opens a thread they hide', () => {
    const component = createComponent(thread());
    component.messageSearch = 'lunch';
    component.applyFilters();

    component.filterNewsToShow('root-1');

    expect(component.messageSearch).toBe('');
    expect(component.replyViewing._id).toBe('root-1');
    expect(component.displayedItems.map(item => item._id)).toEqual([ 'reply-1' ]);
  });

  it('drops a keystroke still in flight when the list switches to another feed', () => {
    vi.useFakeTimers();
    const component = createComponent(thread());
    component.router = { events: new Subject() };
    component.route = { firstChild: null };
    component.ngOnInit();

    component.messageSearch$.next('sprint');
    component.ngOnChanges({ viewableId: { firstChange: false } });
    vi.advanceTimersByTime(400);

    expect(component.messageSearch).toBe('');
    expect(component.filteredItems.length).toBe(3);
    vi.useRealTimers();
  });

  it('drops the filters when the list switches to another feed', () => {
    const component = createComponent(thread());
    component.viewableId = 'team-2';
    component.messageSearch = 'sprint';
    component.selectedLabel = 'help';

    component.ngOnChanges({ viewableId: { firstChange: false } });

    expect(component.messageSearch).toBe('');
    expect(component.selectedLabel).toBe('');
    expect(component.filteredItems.length).toBe(3);
  });
});

describe('NewsListComponent thread navigation', () => {
  it('returns to the page holding the thread when leaving it', () => {
    vi.useFakeTimers();
    const items = Array.from({ length: 12 }, (_, index) => ({ _id: `root-${index}`, doc: { message: `Post ${index}` } }));
    const component = createComponent(items);
    component.applyFilters();

    component.filterNewsToShow('root-11');
    component.filterNewsToShow('root');

    expect(component.pageIndex).toBe(1);
    expect(component.displayedItems.map(item => item._id)).toEqual([ 'root-10', 'root-11' ]);
    vi.useRealTimers();
  });

});

describe('NewsListComponent voice route', () => {
  it('opens the routed voice once the items arrive', () => {
    vi.useFakeTimers();
    const component = createComponent([]);
    component.route = { firstChild: { snapshot: { paramMap: { get: () => 'root-1' } } } };
    component.initNews();

    component.items = [ { _id: 'root-1', doc: { message: 'Weekly sprint planning' } } ];
    component.ngOnChanges({ items: { previousValue: [], currentValue: component.items, firstChange: false } });

    expect(component.replyViewing._id).toBe('root-1');
    vi.useRealTimers();
  });
});

describe('NewsListComponent unread replies', () => {
  const thread = () => ([
    { _id: 'root-1', doc: { message: 'Weekly sprint planning' } },
    { _id: 'reply-1', doc: { message: 'I will bring the budget notes', replyTo: 'root-1' } }
  ]);

  it('marks reply notifications read when their thread opens', () => {
    const component = createComponent(thread());
    component.unreadReplyIds = new Set([ 'root-1' ]);

    component.filterNewsToShow('root-1');

    expect(component.notificationsService.markReplyNotificationsAsRead).toHaveBeenCalledWith('root-1');
    expect(component.newsService.requestNews).toHaveBeenCalled();
    expect(component.unreadReplyIds.has('root-1')).toBe(false);
  });

  it('marks an open thread read on the first unread load only', () => {
    vi.useFakeTimers();
    const unreadReplyIds$ = new Subject<string[]>();
    const component = createComponent(thread());
    component.notificationsService.getUnreadReplyIds$ = () => unreadReplyIds$;
    component.router = { events: new Subject() };
    component.route = { firstChild: { snapshot: { paramMap: { get: () => 'root-1' } } } };

    component.ngOnInit();
    unreadReplyIds$.next([ 'root-1', 'root-2' ]);
    unreadReplyIds$.next([ 'root-1', 'root-2' ]);

    expect(component.replyViewing._id).toBe('root-1');
    expect(component.notificationsService.markReplyNotificationsAsRead).toHaveBeenCalledTimes(1);
    expect(component.notificationsService.markReplyNotificationsAsRead).toHaveBeenCalledWith('root-1');
    expect([ ...component.unreadReplyIds ]).toEqual([ 'root-1', 'root-2' ]);
    component.ngOnDestroy();
    vi.useRealTimers();
  });
});

describe('NewsListComponent reply notifications', () => {
  const setup = (url: string, useReplyRoutes: boolean) => {
    const posted$ = new Subject<void>();
    const component = createComponent([ { _id: 'news-1', doc: { _id: 'news-1', user: { name: 'alex' } } } ]);
    component.useReplyRoutes = useReplyRoutes;
    component.router = { url };
    component.newsService = { postNews: () => posted$ };
    component.dialogsFormService = { closeDialogsForm: vi.fn() };
    component.dialogsLoadingService = { stop: vi.fn() };
    component.notificationsService.sendReplyNotification = vi.fn().mockReturnValue(of({}));
    return { component, posted$, sendReplyNotification: component.notificationsService.sendReplyNotification };
  };

  it('notifies the author only after the reply is posted', () => {
    const { component, posted$, sendReplyNotification } = setup('/', true);

    component.postNews({ replyTo: 'news-1' }, { message: 'Thanks' });
    expect(sendReplyNotification).not.toHaveBeenCalled();
    posted$.next();

    expect(sendReplyNotification).toHaveBeenCalledWith(expect.objectContaining({ _id: 'news-1' }), '/voices/news-1');
  });

  it('links team reply notifications to the team page without its tab parameters', () => {
    const { component, posted$, sendReplyNotification } = setup('/teams/view/team-1;activeTab=taskTab', false);

    component.postNews({ replyTo: 'news-1' }, { message: 'Thanks' });
    posted$.next();

    expect(sendReplyNotification).toHaveBeenCalledWith(expect.objectContaining({ _id: 'news-1' }), '/teams/view/team-1');
  });

  it('does not notify when an existing reply is edited', () => {
    const { component, posted$, sendReplyNotification } = setup('/', true);

    component.postNews({ _id: 'reply-1', replyTo: 'news-1' }, { message: 'Edited' });
    posted$.next();

    expect(sendReplyNotification).not.toHaveBeenCalled();
  });
});
