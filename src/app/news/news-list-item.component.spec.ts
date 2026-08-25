import { NewsListItemComponent } from './news-list-item.component';

describe('NewsListItemComponent label choices', () => {
  const createComponent = (customLabels: string[] = []) => {
    const component = Object.create(NewsListItemComponent.prototype) as NewsListItemComponent;
    component.item = { doc: { labels: [], user: { name: 'author' }, createdOn: 'local' } };
    component.customLabels = customLabels;
    component.labels = { listed: [], all: [] };
    component.planetCode = 'local';
    component.currentUser = { name: 'author' };
    component.editable = true;
    return component;
  };

  it('treats an explicitly empty group label list as authoritative', () => {
    const component = createComponent([]);

    component.updateLabelsAll();

    expect(component.labels.all).toEqual([ 'help', 'offer', 'advice' ]);
  });

  it('does not offer a differently-cased version of an attached label', () => {
    const component = createComponent([ 'event' ]);
    component.item.doc.labels = [ 'Event' ];

    component.updateLabelsAll();

    expect(component.labels.listed).not.toContain('event');
  });

  it('allows label editing only on locally created messages', () => {
    const component = createComponent([ 'event' ]);

    expect(component.canEditLabels).toBe(true);

    component.item.doc.createdOn = 'foreign';
    expect(component.canEditLabels).toBe(false);
  });

  it('uses the message planet for legacy messages without createdOn', () => {
    const component = createComponent([ 'event' ]);
    delete component.item.doc.createdOn;
    component.item.doc.messagePlanetCode = 'local';

    expect(component.canEditLabels).toBe(true);

    component.item.doc.messagePlanetCode = 'foreign';
    expect(component.canEditLabels).toBe(false);
  });
});
