import { ResourcesSearchComponent } from './resources-search.component';

describe('ResourcesSearchComponent', () => {
  const attachment = (filename: string, content_type: string) => ({ _attachments: { [filename]: { content_type } } });

  it('lists each file type found in the resources once', () => {
    const component = new ResourcesSearchComponent();
    const fileType = component.categories.find(category => category.label === 'fileType');
    const resources = [
      { doc: attachment('clip.mp4', 'video/mp4') },
      { doc: attachment('notes.pdf', 'application/pdf') },
      { doc: attachment('slides.pdf', 'application/pdf') },
      { doc: { title: 'Link only' } }
    ];

    expect(component.createSearchList(fileType, resources).items.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: 'PDF', value: 'pdf' },
      { label: 'Video', value: 'video' }
    ]);
  });
});
