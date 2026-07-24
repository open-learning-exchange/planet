import { Subject, of, throwError } from 'rxjs';

import { CSV_PREVIEW_MAX_BYTES } from '../../shared/csv.service';
import { ResourcesViewerComponent } from './resources-viewer.component';

describe('ResourcesViewerComponent CSV preview', () => {
  let component: ResourcesViewerComponent;
  let csvService: { loadCsvAttachment: ReturnType<typeof vi.fn> };
  const csvResource = (filename: string, length: number, contentType = 'text/csv', id = 'resource-id') => ({
    _id: id,
    title: 'CSV resource',
    private: false,
    mediaType: 'other',
    _attachments: {
      [filename]: { content_type: contentType, length }
    }
  });

  beforeEach(() => {
    const resourcesService = {
      resourcesListener: vi.fn(() => of([])),
      requestResourcesUpdate: vi.fn()
    };
    const stateService = {
      configuration: { code: 'planet', parentCode: 'parent', parentDomain: 'parent.example' }
    };
    const couchService = {
      datePlaceholder: {},
      updateDocument: vi.fn(() => of({}))
    };
    csvService = { loadCsvAttachment: vi.fn() };
    component = new ResourcesViewerComponent(
      { bypassSecurityTrustResourceUrl: vi.fn() } as any,
      resourcesService as any,
      { snapshot: { data: { parent: false } } } as any,
      stateService as any,
      { get: vi.fn(() => ({ name: 'user' })) } as any,
      couchService as any,
      csvService as any,
      { url: '/resources' } as any
    );
  });

  it('does not download a CSV that exceeds the preview size limit', () => {
    component.setResource(csvResource('large.csv', CSV_PREVIEW_MAX_BYTES + 1));

    expect(component.mediaType).toBe('csv');
    expect(component.csvPreviewTooLarge).toBe(true);
    expect(csvService.loadCsvAttachment).not.toHaveBeenCalled();
  });

  it('encodes the emitted resource URL and loads CSV files detected by extension', () => {
    csvService.loadCsvAttachment.mockReturnValue(of({
      columns: [ 'Name' ],
      rows: [ { Name: 'Ada' } ],
      truncated: false
    }));
    component.setResource(csvResource('data/scores #1%.csv', 100, 'application/octet-stream', 'doc/with?chars'));

    expect(component.resourceSrc).toContain('doc%2Fwith%3Fchars/data/scores%20%231%25.csv');
    expect(csvService.loadCsvAttachment).toHaveBeenCalledWith('doc/with?chars', 'data/scores #1%.csv', undefined);
    expect(component.dataSource.data).toEqual([ { Name: 'Ada' } ]);
  });

  it('sets the inline error state when loading fails', () => {
    csvService.loadCsvAttachment.mockReturnValue(throwError(new Error('Unable to load')));

    component.setResource(csvResource('scores.csv', 100));

    expect(component.csvLoadError).toBe(true);
  });

  it('ignores stale CSV results after switching resources', () => {
    const firstLoad = new Subject<any>();
    const secondLoad = new Subject<any>();
    csvService.loadCsvAttachment.mockReturnValueOnce(firstLoad).mockReturnValueOnce(secondLoad);

    component.setResource(csvResource('first.csv', 100, 'text/csv', 'first'));
    component.setResource(csvResource('second.csv', 100, 'text/csv', 'second'));
    firstLoad.next({ columns: [ 'Name' ], rows: [ { Name: 'stale' } ], truncated: false });

    expect(component.dataSource).toBeUndefined();

    secondLoad.next({ columns: [ 'Name' ], rows: [ { Name: 'current' } ], truncated: false });
    expect(component.dataSource.data).toEqual([ { Name: 'current' } ]);
  });

});
