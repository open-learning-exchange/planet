import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
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

  it('uploads the file under the name the doc stores, not the picked file name', () => {
    const couchService = {
      datePlaceholder: {},
      updateDocument: vi.fn().mockReturnValue(of({ id: 'res-1', rev: '1-a' })),
      putAttachment: vi.fn().mockReturnValue(of({})),
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
    const file = new File([ '%PDF' ], 'canción #1.pdf', { type: 'application/pdf' });

    TestBed.inject(ResourcesService).updateResource({ filename: 'canción__1.pdf' }, file).subscribe();

    expect(couchService.putAttachment).toHaveBeenCalledWith(
      'resources/res-1/canci%C3%B3n__1.pdf?rev=1-a', file, { headers: { 'Content-Type': 'application/pdf' } }
    );
  });

});
