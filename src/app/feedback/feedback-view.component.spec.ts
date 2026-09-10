import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { FeedbackViewComponent } from './feedback-view.component';
import { FeedbackService } from './feedback.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { UsersService } from '../users/users.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { couchAttachmentUrl } from '../shared/utils';
import { environment } from '../../environments/environment';
import { SyncDirective } from '../manager-dashboard/sync.directive';

describe('FeedbackViewComponent attachments', () => {
  let fixture: ComponentFixture<FeedbackViewComponent>;
  let component: FeedbackViewComponent;
  let couchService: any;
  const name = 'screenshot-a #1.png';
  const user = { name: 'tester', planetCode: 'community' };

  beforeEach(async () => {
    couchService = {
      updateDocument: vi.fn().mockReturnValue(of({ id: 'feedback/1', rev: '2-revision' })),
      put: vi.fn().mockReturnValue(of({ rev: '2-revision' }))
    };
    vi.spyOn(FeedbackViewComponent.prototype, 'ngOnInit').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [FeedbackViewComponent],
      providers: [
        provideRouter([]), provideNoopAnimations(),
        { provide: CouchService, useValue: couchService },
        { provide: UserService, useValue: { get: () => user, userChange$: of(user), doesUserHaveRole: () => false } },
        { provide: UsersService, useValue: {} },
        { provide: StateService, useValue: { configuration: { code: 'community' } } },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn() } },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } },
        FeedbackService
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FeedbackViewComponent);
    component = fixture.componentInstance;
    component.user = user;
    component.feedback = {
      _id: 'feedback/1', _rev: '1-revision', title: 'Feedback', source: 'community', status: 'open',
      messages: [ { user: user.name, time: 1, message: 'Literal **text**\n<script>example</script>', attachments: [ name ] } ],
      _attachments: { [name]: { content_type: 'image/png', stub: true, digest: 'md5-image', revpos: 1, length: 10 } }
    };
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders plain text and responsive attachment links without interpreting Markdown or HTML', () => {
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const text = element.querySelector('.km-feedback-message-text');
    const link = element.querySelector('.km-feedback-attachment');
    const expectedUrl = couchAttachmentUrl(environment.couchAddress, 'feedback', 'feedback/1', name);
    expect(text.textContent).toBe(component.feedback.messages[0].message);
    expect(text.querySelector('script')).toBeNull();
    expect(element.querySelector('planet-markdown')).toBeNull();
    expect(link.getAttribute('href')).toBe(expectedUrl);
    expect(link.querySelector('img').getAttribute('src')).toBe(expectedUrl);
    expect(link.querySelector('img').getAttribute('alt')).toBe(name);
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('handles existing text-only feedback and ignores missing or unsupported attachments', () => {
    expect(component.messageAttachments({})).toEqual([]);
    component.feedback._attachments['vector.svg'] = { content_type: 'image/svg+xml' };
    expect(component.messageAttachments({ attachments: [ 'missing.png', 'vector.svg', name ] })).toEqual([
      { name, url: couchAttachmentUrl(environment.couchAddress, 'feedback', 'feedback/1', name) }
    ]);
  });

  it('keeps document attachment stubs and the original message image links when replying', () => {
    vi.spyOn(component, 'getFeedback').mockReturnValue(of({ docs: [ component.feedback ] }));
    vi.spyOn(component, 'sendNotifications').mockReturnValue(of({}));
    vi.spyOn(component, 'setFeedback').mockImplementation(() => {});
    component.normalizedStatus = 'closed';
    component.newMessage = 'Follow-up';
    component.postMessage();

    const [ db, document ] = couchService.updateDocument.mock.calls[0];
    expect(db).toBe('feedback');
    expect(document._attachments).toEqual(component.feedback._attachments);
    expect(document.messages[0].attachments).toEqual([ name ]);
    expect(document.messages[1].attachments).toBeUndefined();
    expect(component.feedback.messages).toHaveLength(1);
  });

  it('preserves attachments when changing the title, closing or reopening feedback', () => {
    component.setTitle();
    expect(couchService.put.mock.calls[0][1]._attachments).toEqual(component.feedback._attachments);

    const service = TestBed.inject(FeedbackService);
    service.closeFeedback(component.feedback).subscribe();
    service.openFeedback(component.feedback).subscribe();
    expect(couchService.updateDocument).toHaveBeenCalledTimes(2);
    couchService.updateDocument.mock.calls.forEach(([ db, document ]) => {
      expect(db).toBe('feedback');
      expect(document._attachments).toEqual(component.feedback._attachments);
    });
  });

  it('keeps feedback in both Community-to-Nation and return replication selections', () => {
    const sync = new SyncDirective(
      {} as any, {} as any, {} as any, {} as any, {} as any,
      { configuration: { code: 'community', parentCode: 'nation' } } as any, {} as any, {} as any
    );
    const feedbackReplicators = sync.replicatorList().filter(item => item.db === 'feedback');
    expect(feedbackReplicators).toContainEqual(expect.objectContaining({ db: 'feedback', type: 'push' }));
    expect(feedbackReplicators).toContainEqual(expect.objectContaining({
      db: 'feedback', type: 'pull', selector: { source: 'community' }
    }));
  });
});
