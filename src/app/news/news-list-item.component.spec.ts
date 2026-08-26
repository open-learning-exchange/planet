import { of } from 'rxjs';
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { NewsListItemComponent } from './news-list-item.component';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { NewsService } from './news.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StateService } from '../shared/state.service';
import { AuthService } from '../shared/auth-guard.service';

describe('NewsListItemComponent read-only behavior', () => {
  const createComponent = () => {
    const authService = { checkAuthenticationStatus: vi.fn(() => of(undefined)) };
    const clipboard = { copy: vi.fn() };
    const component = new NewsListItemComponent(
      {} as any,
      { get: vi.fn(() => ({ _id: 'user', name: 'user' })), userChange$: of(undefined) } as any,
      {} as any,
      {} as any,
      {} as any,
      { configuration: { code: 'local', planetType: 'nation' } } as any,
      {} as any,
      authService as any,
      clipboard as any,
      { watchDeviceType: vi.fn(() => of(DeviceType.DESKTOP)) } as any
    );
    component.item = { doc: { _id: 'voice', labels: [], user: { _id: 'user', name: 'user' }, viewIn: [] } };
    component.readOnly = true;

    return { authService, component };
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

});

describe('NewsListItemComponent read-only template', () => {
  const renderReadOnly = async (deviceType: DeviceType) => {
    await TestBed.configureTestingModule({
      imports: [NewsListItemComponent],
      providers: [
        { provide: Router, useValue: { url: '/community/remote', navigate: vi.fn() } },
        { provide: UserService, useValue: { get: () => ({ _id: 'user', name: 'user', isUserAdmin: true }), userChange$: of(undefined) } },
        { provide: CouchService, useValue: { datePlaceholder: 0 } },
        { provide: NewsService, useValue: { postSharedWithCommunity: vi.fn(() => false) } },
        { provide: NotificationsService, useValue: {} },
        { provide: StateService, useValue: { configuration: { code: 'local', planetType: 'nation' } } },
        { provide: MatDialog, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: Clipboard, useValue: { copy: vi.fn() } },
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
