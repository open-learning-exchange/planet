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

  const setup = (putDocumentWithFiles) => {
    couchService = {
      datePlaceholder: {},
      putDocumentWithFiles,
      updateDocument: vi.fn(),
      bulkDocs: vi.fn().mockReturnValue(of([]))
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CouchService, useValue: couchService },
        { provide: RatingService, useValue: { ratingsUpdated$: EMPTY } },
        { provide: StateService, useValue: { couchStateListener: () => EMPTY } },
        { provide: TagsService, useValue: { tagBulkDocs: () => [] } },
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

});
