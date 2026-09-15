import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { NewsListComponent } from './news-list.component';

const createComponent = (items: any[] = []) => {
  const component = Object.create(NewsListComponent.prototype) as any;
  component.items = items;
  component.filteredItems = items;
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
