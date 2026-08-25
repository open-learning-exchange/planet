import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';
import { MeetupService } from './meetups.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

describe('MeetupService', () => {
  let service: MeetupService;
  let dialogOpenSpy: any;

  const openDeleteDialog = (meetup: any) => {
    service.openDeleteDialog(meetup, () => {});
    return dialogOpenSpy.mock.calls[0][1].data;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MeetupService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open: vi.fn().mockReturnValue({ close: vi.fn() }) } }
      ]
    });

    service = TestBed.inject(MeetupService);
    dialogOpenSpy = TestBed.inject(MatDialog).open;
  });

  it('marks recurrence details as a supplementary message on the delete prompt', () => {
    const data = openDeleteDialog({ title: 'Weekly standup', recurring: 'weekly', recurringNumber: 4 });

    expect(dialogOpenSpy).toHaveBeenCalledWith(DialogsPromptComponent, expect.anything());
    expect(data.extraMessage).toBe('(Recurs weekly for 4 weeks)');
    expect(data.extraMessageType).toBe('supplementary');
  });

  it('leaves the delete prompt without an extra message for a one-off event', () => {
    const data = openDeleteDialog({ title: 'Book club', recurring: 'none' });

    expect(data.extraMessage).toBe('');
  });
});
