import { APP_BASE_HREF } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { LinkCopyService } from './link-copy.service';
import { PlanetMessageService } from './planet-message.service';

describe('LinkCopyService', () => {
  const clipboard = { copy: vi.fn() };
  const planetMessageService = {
    showMessage: vi.fn(),
    showAlert: vi.fn()
  };
  let service: LinkCopyService;

  beforeEach(() => {
    clipboard.copy.mockReset();
    planetMessageService.showMessage.mockReset();
    planetMessageService.showAlert.mockReset();
    TestBed.configureTestingModule({
      providers: [
        LinkCopyService,
        provideRouter([]),
        { provide: APP_BASE_HREF, useValue: '/spa/' },
        { provide: Clipboard, useValue: clipboard },
        { provide: PlanetMessageService, useValue: planetMessageService }
      ]
    });
    service = TestBed.inject(LinkCopyService);
  });

  it('copies an application URL with the configured locale base path', () => {
    clipboard.copy.mockReturnValue(true);

    const copied = service.copyLink(
      [ '/resources/view', 'resource-id' ],
      { success: 'Copied', failure: 'Failed' }
    );

    expect(copied).toBe(true);
    expect(clipboard.copy).toHaveBeenCalledWith(`${window.location.origin}/spa/resources/view/resource-id`);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('Copied');
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('shows an alert when the clipboard rejects the copy', () => {
    clipboard.copy.mockReturnValue(false);

    const copied = service.copyLink(
      [ '/voices', 'voice-id' ],
      { success: 'Copied', failure: 'Failed' }
    );

    expect(copied).toBe(false);
    expect(planetMessageService.showMessage).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith('Failed');
  });

  it('serializes matrix parameters in shared links', () => {
    clipboard.copy.mockReturnValue(true);

    service.copyLink(
      [ '/profile', 'learner', 'achievements', { planet: 'planet-code' } ],
      { success: 'Copied', failure: 'Failed' }
    );

    expect(clipboard.copy).toHaveBeenCalledWith(
      `${window.location.origin}/spa/profile/learner/achievements;planet=planet-code`
    );
  });
});
