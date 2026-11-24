import { TestBed } from '@angular/core/testing';
import { EMPTY, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { TagsService } from '@shared/forms/tags/tags.service';
import { RatingService } from '@shared/ratings/rating.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';

import { UsersService } from '../users/users.service';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {

  const file = new File([ '%PDF' ], 'canción #1.pdf', { type: 'application/pdf' });
  let couchService;
  let tagsService;

  const setup = (putDocumentWithFiles) => {
    couchService = {
      datePlaceholder: {},
      putDocumentWithFiles,
      updateDocument: vi.fn(),
      get: vi.fn(),
      findAll: vi.fn(),
      bulkDocs: vi.fn().mockReturnValue(of([]))
    };
    tagsService = { tagBulkDocs: vi.fn().mockReturnValue([]) };
    TestBed.configureTestingModule({
      providers: [
        { provide: CouchService, useValue: couchService },
        { provide: RatingService, useValue: { ratingsUpdated$: EMPTY } },
        { provide: StateService, useValue: { couchStateListener: () => EMPTY } },
        { provide: TagsService, useValue: tagsService },
        { provide: UserService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: PlanetMessageService, useValue: {} }
      ]
    });
    return TestBed.inject(ResourcesService);
  };

  it('saves an edit that replaces the file as one write carrying the doc and the new file', () => {
    const edit = { _id: 'res-1', _rev: '1-a', filename: 'canción__1.pdf', _attachments: {} };

    setup(vi.fn().mockReturnValue(of({ ok: true, id: 'res-1', rev: '2-b' }))).updateResource(edit, file).subscribe();

    expect(couchService.putDocumentWithFiles).toHaveBeenCalledWith('resources', expect.objectContaining(edit), { 'canción__1.pdf': file });
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('writes nothing else when the write with the file fails', () => {
    const error = vi.fn();

    setup(vi.fn().mockReturnValue(throwError(() => new Error('offline'))))
      .updateResource({ filename: 'canción__1.pdf' }, file).subscribe({ error });

    expect(error).toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('writes a retried create over its landed attempt and reconciles the tag links already saved', () => {
    const create = { _id: 'res-1', filename: 'canción__1.pdf' };
    const link = { _id: 'link-1', _rev: '1-l', docType: 'link', db: 'resources', linkId: 'res-1', tagId: 'math' };
    const put = vi.fn()
      .mockReturnValueOnce(throwError(() => ({ status: 409 })))
      .mockReturnValueOnce(of({ ok: true, id: 'res-1', rev: '2-b' }));
    const service = setup(put);
    couchService.get.mockReturnValue(of({ _id: 'res-1', _rev: '1-a' }));
    couchService.findAll.mockReturnValue(of([ link ]));

    service.updateResource(create, file, { newTags: [ 'math' ], existingTags: undefined }).subscribe();

    expect(put).toHaveBeenLastCalledWith('resources', expect.objectContaining({ ...create, _rev: '1-a' }), { 'canción__1.pdf': file });
    expect(tagsService.tagBulkDocs).toHaveBeenCalledWith('res-1', 'resources', [ 'math' ], [ { tagId: 'math', tagLink: link } ]);
  });

  it('does not replace a landed create that was edited since', () => {
    const error = vi.fn();
    const put = vi.fn().mockReturnValue(throwError(() => ({ status: 409 })));
    const service = setup(put);
    couchService.get.mockReturnValue(of({ _id: 'res-1', _rev: '2-c' }));
    couchService.findAll.mockReturnValue(of([]));

    service.updateResource({ _id: 'res-1', filename: 'canción__1.pdf' }, file).subscribe({ error });

    expect(error).toHaveBeenCalledWith({ status: 409 });
    expect(put).toHaveBeenCalledTimes(1);
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('still fails an edit that gets a 409', () => {
    const error = vi.fn();
    const conflict = throwError(() => ({ status: 409 }));

    const edit = { _id: 'res-1', _rev: '1-a', filename: 'canción__1.pdf' };

    setup(vi.fn().mockReturnValue(conflict)).updateResource(edit, file).subscribe({ error });

    expect(error).toHaveBeenCalled();
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

});
