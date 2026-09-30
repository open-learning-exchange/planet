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

describe('FeedbackViewComponent screenshots', () => {
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
      messages: [ { user: user.name, time: 1, message: 'The save button does nothing', attachments: [ name ] } ],
      _attachments: { [name]: { content_type: 'image/png', stub: true, digest: 'md5-image', revpos: 1, length: 10 } }
    };
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('links only uploaded image screenshots below their message', () => {
    component.feedback._attachments['vector.svg'] = { content_type: 'image/svg+xml', stub: true };
    component.feedback.messages[0].attachments = [ 'missing.png', 'vector.svg', name ];
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.km-feedback-attachment');
    const url = couchAttachmentUrl(environment.couchAddress, 'feedback', 'feedback/1', name);
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(url);
    expect(links[0].querySelector('img').getAttribute('src')).toBe(url);
  });

  it('keeps the screenshots on every later write to the feedback document', () => {
    vi.spyOn(component, 'getFeedback').mockReturnValue(of({ docs: [ component.feedback ] }));
    vi.spyOn(component, 'sendNotifications').mockReturnValue(of({}));
    vi.spyOn(component, 'setFeedback').mockImplementation(() => {});
    const feedbackService = TestBed.inject(FeedbackService);

    component.newMessage = 'Follow-up';
    component.postMessage();
    component.setTitle();
    feedbackService.closeFeedback(component.feedback).subscribe();
    feedbackService.openFeedback(component.feedback).subscribe();

    const writes = [ ...couchService.updateDocument.mock.calls, ...couchService.put.mock.calls ].map(([ , document ]) => document);
    expect(writes).toHaveLength(4);
    writes.forEach(document => expect(document._attachments).toEqual(component.feedback._attachments));
  });
});
