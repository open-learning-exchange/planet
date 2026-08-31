import { of } from 'rxjs';
import { vi } from 'vitest';
import { NewsListComponent } from './news-list.component';

describe('NewsListComponent labels', () => {
  it('handles label removal from a legacy post without a labels array', () => {
    const component = Object.create(NewsListComponent.prototype) as any;
    component.changeLabelsFilter = { emit: vi.fn() };
    component.newsService = { postNews: vi.fn().mockReturnValue(of({})) };
    const news = { _id: 'news-1' };

    component.changeLabels({ news, label: 'Event', action: 'remove' });

    expect(component.newsService.postNews).toHaveBeenCalledWith(
      { ...news, labels: [] },
      'Label removed'
    );
  });
});
