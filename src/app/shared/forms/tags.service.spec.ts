import { of } from 'rxjs';
import { vi } from 'vitest';

import { TAG_IN_USE_ERROR, TagsService } from './tags.service';

describe('TagsService', () => {
  const createService = ({ links = [], courses = [] }: { links?: any[], courses?: any[] } = {}) => {
    const couchService = {
      findAll: vi.fn().mockImplementation((db: string) => of(db === 'tags' ? links : courses)),
      bulkDocs: vi.fn().mockReturnValue(of([]))
    };
    return { couchService, service: new TagsService(couchService as any, {} as any) };
  };
  const tag = { _id: 'courses_agriculture', name: 'Agriculture', db: 'courses', docType: 'definition' };

  it('refuses to delete a collection which is still used by a course', () => {
    const { couchService, service } = createService({
      links: [ { _id: 'link-1', tagId: tag._id, linkId: 'course-1', docType: 'link', db: 'courses' } ],
      courses: [ { _id: 'course-1' } ]
    });
    const onError = vi.fn();

    service.deleteTag(tag).subscribe({ error: onError });

    expect(onError).toHaveBeenCalledWith(new Error(TAG_IN_USE_ERROR));
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('deletes a collection whose only links point at courses which no longer exist', () => {
    const link = { _id: 'link-1', _rev: '1-a', tagId: tag._id, linkId: 'deleted-course', docType: 'link', db: 'courses' };
    const { couchService, service } = createService({ links: [ link ], courses: [] });

    service.deleteTag(tag).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('tags', [
      { _id: link._id, _rev: link._rev, _deleted: true },
      { ...tag, _deleted: true }
    ]);
  });

  it('deletes an unused collection without querying its database', () => {
    const { couchService, service } = createService();

    service.deleteTag(tag).subscribe();

    expect(couchService.findAll).toHaveBeenCalledTimes(1);
    expect(couchService.bulkDocs).toHaveBeenCalledWith('tags', [ { ...tag, _deleted: true } ]);
  });
});
