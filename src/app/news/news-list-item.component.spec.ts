import { of } from 'rxjs';
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

  it('links a team message to its team page without tab parameters', () => {
    const { component, linkCopyService, router } = createComponent();
    router.url = '/teams/view/team-1;activeTab=taskTab';

    component.copyLink({ _id: 'message-id' });

    expect(linkCopyService.copyLink.mock.calls[0][0]).toEqual([ '/teams/view/team-1' ]);
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
  });

  it('hides mobile copy and mutation controls', async () => {
    const fixture = await renderReadOnly(DeviceType.MOBILE);

    fixture.debugElement.query(By.css('.menu')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.querySelector('.km-copy-voice')).toBeNull();
    expect(document.body.querySelector('.km-edit-voice')).toBeNull();
    expect(document.body.querySelector('.km-delete-voice')).toBeNull();
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
