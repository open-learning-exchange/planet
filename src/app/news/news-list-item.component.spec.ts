import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { NewsListItemComponent } from './news-list-item.component';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { LabelComponent } from '../shared/label.component';
import { UserService } from '../shared/user.service';
import { NewsService } from './news.service';
import { StateService } from '../shared/state.service';
import { AuthService } from '../shared/auth-guard.service';
import { LinkCopyService } from '../shared/link-copy.service';

describe('NewsListItemComponent read-only behavior', () => {
  const createComponent = () => {
    const authService = { checkAuthenticationStatus: vi.fn(() => of(undefined)) };
    const linkCopyService = { copyLink: vi.fn() };
    const router = { url: '/' };
    const component = new NewsListItemComponent(
      router as any,
      { get: vi.fn(() => ({ _id: 'user', name: 'user' })), userChange$: of(undefined) } as any,
      {} as any,
      { configuration: { code: 'local', planetType: 'nation' } } as any,
      {} as any,
      authService as any,
      linkCopyService as any,
      { watchDeviceType: vi.fn(() => of(DeviceType.DESKTOP)) } as any
    );
    component.item = { doc: { _id: 'voice', labels: [], user: { _id: 'user', name: 'user' }, viewIn: [] } };
    component.readOnly = true;

    return { authService, component, linkCopyService, router };
  };

  it('blocks every mutating action while retaining label filtering', () => {
    const { authService, component } = createComponent();
    const updateSpy = vi.spyOn(component.updateNews, 'emit');
    const deleteSpy = vi.spyOn(component.deleteNews, 'emit');
    const shareSpy = vi.spyOn(component.shareNews, 'emit');
    const labelSpy = vi.spyOn(component.changeLabels, 'emit');

    component.addReply(component.item.doc);
    component.editNews(component.item.doc);
    component.openDeleteDialog(component.item.doc);
    component.shareStory(component.item.doc);
    component.labelClick('help', 'add');

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(shareSpy).not.toHaveBeenCalled();
    expect(labelSpy).not.toHaveBeenCalled();

    component.labelClick('help', 'select');
    expect(labelSpy).toHaveBeenCalledOnce();
  });

  it('delegates Voice links to the shared copy service', () => {
    const { component, linkCopyService } = createComponent();

    component.copyLink({ _id: 'voice-id' });

    expect(linkCopyService.copyLink).toHaveBeenCalledWith(
      [ '/voices', 'voice-id' ],
      {
        success: 'Voice link copied to clipboard',
        failure: 'Failed to copy voice link'
      }
    );
  });

  it('links a reply to the conversation it sits in', () => {
    const { component, linkCopyService } = createComponent();

    component.copyLink({ _id: 'reply-id', replyTo: 'voice-id' });

    expect(linkCopyService.copyLink.mock.calls[0][0]).toEqual([ '/voices', 'voice-id' ]);
  });

  it('links a post moved to the main feed by a delete to itself', () => {
    const { component, linkCopyService } = createComponent();

    component.copyLink({ _id: 'voice-id', replyTo: 'root' });

    expect(linkCopyService.copyLink.mock.calls[0][0]).toEqual([ '/voices', 'voice-id' ]);
  });

  it('links a team message to its thread on the team page without tab parameters', () => {
    const { component, linkCopyService, router } = createComponent();
    router.url = '/teams/view/team-1;activeTab=taskTab';

    component.copyLink({ _id: 'message-id' });

    expect(linkCopyService.copyLink.mock.calls[0][0]).toEqual([ '/teams/view/team-1', { voice: 'message-id' } ]);
  });

});

describe('NewsListItemComponent read-only template', () => {
  const renderReadOnly = async (deviceType: DeviceType) => {
    await TestBed.configureTestingModule({
      imports: [NewsListItemComponent],
      providers: [
        { provide: Router, useValue: { url: '/community/remote', navigate: vi.fn() } },
        { provide: UserService, useValue: { get: () => ({ _id: 'user', name: 'user', isUserAdmin: true }), userChange$: of(undefined) } },
        { provide: NewsService, useValue: { postSharedWithCommunity: vi.fn(() => false) } },
        { provide: StateService, useValue: { configuration: { code: 'local', planetType: 'nation' } } },
        { provide: MatDialog, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: LinkCopyService, useValue: { copyLink: vi.fn() } },
        { provide: DeviceInfoService, useValue: { watchDeviceType: () => of(deviceType) } },
        provideNoopAnimations()
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(NewsListItemComponent);
    fixture.componentRef.setInput('item', {
      _id: 'voice',
      avatar: 'assets/image.png',
      doc: {
        _id: 'voice',
        createdOn: 'local',
        labels: [],
        message: 'Voice',
        time: 0,
        user: { _id: 'user', name: 'user' },
        viewIn: []
      }
    });
    fixture.componentRef.setInput('replyObject', { voice: [] });
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();

    return fixture;
  };

  it('hides desktop copy and mutation controls', async () => {
    const fixture = await renderReadOnly(DeviceType.DESKTOP);

    expect(fixture.debugElement.query(By.css('.km-copy-voice'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.km-edit-voice'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.km-delete-voice'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.km-react-voice'))).toBeNull();
  });

  it('hides mobile copy and mutation controls', async () => {
    const fixture = await renderReadOnly(DeviceType.MOBILE);

    fixture.debugElement.query(By.css('.menu')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.querySelector('.km-copy-voice')).toBeNull();
    expect(document.body.querySelector('.km-edit-voice')).toBeNull();
    expect(document.body.querySelector('.km-delete-voice')).toBeNull();
    expect(document.body.querySelector('.km-react-voice')).toBeNull();
  });
});

describe('NewsListItemComponent label choices', () => {
  const createComponent = (customLabels: string[] = []) => {
    const component = Object.create(NewsListItemComponent.prototype) as NewsListItemComponent;
    component.item = { doc: { labels: [], user: { name: 'author' }, createdOn: 'local' } };
    component.customLabels = customLabels;
    component.labels = { listed: [], all: [] };
    component.planetCode = 'local';
    component.currentUser = { name: 'author' };
    component.editable = true;
    return component;
  };

  it('treats an explicitly empty group label list as authoritative', () => {
    const component = createComponent([]);

    component.updateLabelsAll();

    expect(component.labels.all).toEqual([ 'help', 'offer', 'advice' ]);
  });

  it('does not offer a differently-cased version of an attached label', () => {
    const component = createComponent([ 'event' ]);
    component.item.doc.labels = [ 'Event' ];

    component.updateLabelsAll();

    expect(component.labels.listed).not.toContain('event');
  });

  it('allows label editing only on locally created messages', () => {
    const component = createComponent([ 'event' ]);

    expect(component.canEditLabels).toBe(true);

    component.item.doc.createdOn = 'foreign';
    expect(component.canEditLabels).toBe(false);
  });

  it('uses the message planet for legacy messages without createdOn', () => {
    const component = createComponent([ 'event' ]);
    delete component.item.doc.createdOn;
    component.item.doc.messagePlanetCode = 'local';

    expect(component.canEditLabels).toBe(true);

    component.item.doc.messagePlanetCode = 'foreign';
    expect(component.canEditLabels).toBe(false);
  });
});

describe('voice label display', () => {
  it('does not resolve custom labels through inherited object properties', () => {
    const component = new LabelComponent();
    component.label = 'constructor';

    expect(component.getTranslatedLabel()).toBe('constructor');
  });
});

describe('NewsListItemComponent emoji reactions', () => {
  const setupReactions = (currentUserId = 'user-1') => {
    const authService = { checkAuthenticationStatus: vi.fn(() => of(undefined)) };
    const newsService = {
      saveReaction: vi.fn(() => of({ ok: true })),
      postSharedWithCommunity: vi.fn(() => false)
    };
    const component = new NewsListItemComponent(
      { url: '/voices' } as any,
      { get: vi.fn(() => ({ _id: currentUserId, name: 'Alex' })), userChange$: of(undefined) } as any,
      newsService as any,
      { configuration: { code: 'local', planetType: 'nation' } } as any,
      {} as any,
      authService as any,
      { copyLink: vi.fn() } as any,
      { watchDeviceType: vi.fn(() => of(DeviceType.DESKTOP)) } as any
    );
    component.item = {
      _id: 'voice-1',
      doc: {
        _id: 'voice-1',
        reactions: { '👍': ['user-1', 'user-2'], '❤️': ['user-3'] },
        user: { _id: 'user-2', name: 'Bob' },
        labels: [],
        viewIn: []
      }
    };
    return { component, authService, newsService };
  };

  it('extracts reaction entries with counts and users', () => {
    const { component } = setupReactions();
    const entries = component.reactionEntries(component.item.doc);

    expect(entries).toEqual([
      { emoji: '👍', count: 2, users: ['user-1', 'user-2'] },
      { emoji: '❤️', count: 1, users: ['user-3'] }
    ]);
  });

  it('determines if the current user has reacted', () => {
    const { component } = setupReactions('user-1');

    expect(component.hasUserReacted(component.item.doc, '👍')).toBe(true);
    expect(component.hasUserReacted(component.item.doc, '❤️')).toBe(false);
    expect(component.hasUserReacted(component.item.doc, '🔥')).toBe(false);
  });

  it('formats tooltip messages accurately', () => {
    const { component } = setupReactions('user-1');

    expect(component.reactionTooltip('👍', ['user-1', 'user-2'])).toBe('You and 1 other reacted with 👍');
    expect(component.reactionTooltip('👍', ['user-1'])).toBe('You reacted with 👍');
    expect(component.reactionTooltip('❤️', ['user-3'])).toBe('1 person reacted with ❤️');
    expect(component.reactionTooltip('🔥', ['user-3', 'user-4'])).toBe('2 people reacted with 🔥');
  });

  it('formats label for reaction action', () => {
    const { component } = setupReactions('user-1');
    expect(component.reactionLabel('👍')).toBe('React with 👍');
  });

  it('toggles reaction, updates _rev on success, and checks auth', () => {
    const { component, authService, newsService } = setupReactions('user-1');
    newsService.saveReaction.mockReturnValue(of({ ok: true, rev: '2-rev' }));

    component.toggleReaction(component.item.doc, '🔥');

    expect(authService.checkAuthenticationStatus).toHaveBeenCalled();
    expect(newsService.saveReaction).toHaveBeenCalledWith(expect.objectContaining({ _id: 'voice-1' }));
    expect(component.item.doc.reactions).toEqual({
      '👍': ['user-2'],
      '❤️': ['user-3'],
      '🔥': ['user-1']
    });
    expect(component.item.doc._rev).toBe('2-rev');
    expect(component.reactionSaving).toBe(false);
  });

  it('restores previous reactions when saveReaction fails', () => {
    const { component, authService, newsService } = setupReactions('user-1');
    const previousReactions = { '👍': ['user-1', 'user-2'], '❤️': ['user-3'] };
    newsService.saveReaction.mockReturnValue(throwError(new Error('Network error')));

    component.toggleReaction(component.item.doc, '🔥');

    expect(authService.checkAuthenticationStatus).toHaveBeenCalled();
    expect(component.item.doc.reactions).toEqual(previousReactions);
    expect(component.reactionSaving).toBe(false);
  });

  it('ignores toggle calls while reactionSaving is true', () => {
    const { component, authService, newsService } = setupReactions('user-1');
    component.reactionSaving = true;

    component.toggleReaction(component.item.doc, '👍');

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(newsService.saveReaction).not.toHaveBeenCalled();
  });

  it('does not toggle reaction when in readOnly mode', () => {
    const { component, authService, newsService } = setupReactions('user-1');
    component.readOnly = true;

    component.toggleReaction(component.item.doc, '👍');

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(newsService.saveReaction).not.toHaveBeenCalled();
  });

  it('does not toggle reaction on a non-public voice the user cannot edit', () => {
    const { component, authService, newsService } = setupReactions('user-1');
    component.editable = false;

    component.toggleReaction(component.item.doc, '👍');

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(newsService.saveReaction).not.toHaveBeenCalled();
  });
});

describe('NewsListItemComponent reactions template', () => {
  const renderWithReactions = async (reactions: any = { '👍': ['user-1'], '❤️': ['user-2'] }) => {
    await TestBed.configureTestingModule({
      imports: [NewsListItemComponent],
      providers: [
        { provide: Router, useValue: { url: '/community', navigate: vi.fn() } },
        {
          provide: UserService,
          useValue: { get: () => ({ _id: 'user-1', name: 'user-1' }), userChange$: of(undefined) }
        },
        {
          provide: NewsService,
          useValue: { postSharedWithCommunity: vi.fn(() => false), saveReaction: vi.fn(() => of({ ok: true })) }
        },
        { provide: StateService, useValue: { configuration: { code: 'local', planetType: 'nation' } } },
        { provide: MatDialog, useValue: {} },
        { provide: AuthService, useValue: { checkAuthenticationStatus: () => of(undefined) } },
        { provide: LinkCopyService, useValue: { copyLink: vi.fn() } },
        { provide: DeviceInfoService, useValue: { watchDeviceType: () => of(DeviceType.DESKTOP) } },
        provideNoopAnimations()
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(NewsListItemComponent);
    fixture.componentRef.setInput('item', {
      _id: 'voice-1',
      avatar: 'assets/image.png',
      doc: {
        _id: 'voice-1',
        createdOn: 'local',
        labels: [],
        message: 'Voice message',
        reactions,
        time: 0,
        user: { _id: 'user-2', name: 'user-2' },
        viewIn: []
      }
    });
    fixture.componentRef.setInput('replyObject', { 'voice-1': [] });
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();

    return fixture;
  };

  it('renders reaction chips and highlights active reaction', async () => {
    const fixture = await renderWithReactions();

    const chips = fixture.debugElement.queryAll(By.css('.km-reaction-chip'));
    expect(chips.length).toBe(2);

    expect(chips[0].nativeElement.textContent).toContain('👍');
    expect(chips[0].nativeElement.textContent).toContain('1');
    expect(chips[0].nativeElement.classList).toContain('active');
    expect(chips[0].nativeElement.getAttribute('aria-pressed')).toBe('true');
    expect(chips[0].nativeElement.getAttribute('aria-label')).toBe('React with 👍');

    expect(chips[1].nativeElement.textContent).toContain('❤️');
    expect(chips[1].nativeElement.classList).not.toContain('active');
    expect(chips[1].nativeElement.getAttribute('aria-pressed')).toBe('false');
    expect(chips[1].nativeElement.getAttribute('aria-label')).toBe('React with ❤️');

    const reactBtn = fixture.debugElement.query(By.css('.km-react-voice'));
    expect(reactBtn).not.toBeNull();
  });
});
